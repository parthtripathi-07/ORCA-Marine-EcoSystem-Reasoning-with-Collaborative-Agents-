"""
ORCA Authentication & Identity Service
Supports:
1. Salted PBKDF2-HMAC-SHA256 Password Hashing & Constant-time verification
2. 6-Digit Cryptographic OTP generation (5-minute expiry, max 5 failed attempts lockout)
3. Secure Bearer Session Tokens (7-day validity)
4. Dual-Engine Persistence: PostgreSQL with automated resilient SQLite fallback (backend/data/orca_auth.db)
"""

import os
import time
import secrets
import hashlib
import sqlite3
import logging
from typing import Optional, Dict, Any, Tuple
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("orca-auth")

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_NAME = os.getenv("DB_NAME", "orca_db")

# Local SQLite fallback path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)
SQLITE_AUTH_DB = os.path.join(DATA_DIR, "orca_auth.db")

# In-memory fast OTP store: { phone: { otp, expiry, attempts, purpose, temp_user_data } }
OTP_CACHE: Dict[str, Dict[str, Any]] = {}

# Constants
OTP_EXPIRY_SECONDS = 300      # 5 minutes
SESSION_EXPIRY_SECONDS = 7 * 86400  # 7 days
MAX_OTP_ATTEMPTS = 5


# ---------------------------------------------------------------------------
# 1. Cryptographic Security Helpers
# ---------------------------------------------------------------------------

def hash_password(password: str) -> str:
    """Hash password using PBKDF2-HMAC-SHA256 with 100,000 iterations and 16-byte salt."""
    salt = secrets.token_bytes(16)
    key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
    return f"{salt.hex()}:{key.hex()}"

def verify_password(stored_hash: str, candidate_password: str) -> bool:
    """Verify password against stored salt:key in constant time."""
    try:
        if not stored_hash or ":" not in stored_hash:
            return False
        parts = stored_hash.split(':')
        if len(parts) != 2:
            return False
        salt = bytes.fromhex(parts[0])
        expected_key = bytes.fromhex(parts[1])
        actual_key = hashlib.pbkdf2_hmac('sha256', candidate_password.encode('utf-8'), salt, 100000)
        return secrets.compare_digest(actual_key, expected_key)
    except Exception as e:
        logger.error(f"Password verification error: {e}")
        return False

def generate_crypto_otp() -> str:
    """Generate a high-entropy 6-digit numeric OTP."""
    return f"{secrets.randbelow(900000) + 100000:06d}"

def generate_session_token() -> str:
    """Generate a URL-safe 256-bit cryptographically random token."""
    return f"orca_sec_{secrets.token_urlsafe(32)}"


# ---------------------------------------------------------------------------
# 2. Database Connection & Schema Setup
# ---------------------------------------------------------------------------

def get_pg_connection():
    """Attempt connection to PostgreSQL database."""
    try:
        import psycopg2
        from psycopg2.extras import RealDictCursor
        if DATABASE_URL:
            return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor, connect_timeout=3)
        return psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASSWORD,
            dbname=DB_NAME,
            cursor_factory=RealDictCursor,
            connect_timeout=3
        )
    except Exception:
        return None

def get_sqlite_connection():
    """Get connection to local SQLite database with Row factory."""
    conn = sqlite3.connect(SQLITE_AUTH_DB, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_auth_tables():
    """Initialize authentication tables in PostgreSQL or SQLite."""
    pg = get_pg_connection()
    if pg:
        try:
            with pg.cursor() as cur:
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS orca_registered_users (
                        id SERIAL PRIMARY KEY,
                        full_name VARCHAR(150) NOT NULL,
                        phone VARCHAR(20) UNIQUE NOT NULL,
                        vessel_id VARCHAR(100) UNIQUE,
                        home_port VARCHAR(100) DEFAULT 'chennai',
                        role VARCHAR(50) DEFAULT 'fisher',
                        password_hash TEXT NOT NULL,
                        is_verified BOOLEAN DEFAULT TRUE,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                """)
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS orca_active_sessions (
                        token VARCHAR(150) PRIMARY KEY,
                        user_id INT REFERENCES orca_registered_users(id) ON DELETE CASCADE,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        expires_at TIMESTAMP NOT NULL
                    );
                """)
                pg.commit()
            pg.close()
            logger.info("[Auth] PostgreSQL authentication tables initialized.")
        except Exception as e:
            logger.warning(f"[Auth] PostgreSQL schema init failed, falling back to SQLite: {e}")
            if pg:
                pg.close()

    # Resilient SQLite Schema (Always ensure fallback is ready)
    try:
        sq = get_sqlite_connection()
        with sq:
            sq.execute("""
                CREATE TABLE IF NOT EXISTS orca_registered_users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    full_name TEXT NOT NULL,
                    phone TEXT UNIQUE NOT NULL,
                    vessel_id TEXT UNIQUE,
                    home_port TEXT DEFAULT 'chennai',
                    role TEXT DEFAULT 'fisher',
                    password_hash TEXT NOT NULL,
                    is_verified INTEGER DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            sq.execute("""
                CREATE TABLE IF NOT EXISTS orca_active_sessions (
                    token TEXT PRIMARY KEY,
                    user_id INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    expires_at TIMESTAMP NOT NULL,
                    FOREIGN KEY(user_id) REFERENCES orca_registered_users(id)
                );
            """)
        sq.close()
        logger.info("[Auth] SQLite authentication tables initialized at %s", SQLITE_AUTH_DB)
    except Exception as e:
        logger.error(f"[Auth] SQLite schema init failed: {e}")

# Run schema init on import
init_auth_tables()


# ---------------------------------------------------------------------------
# 3. User Data Access Functions
# ---------------------------------------------------------------------------

def find_user_by_identifier(identifier: str) -> Optional[Dict[str, Any]]:
    """Search user by phone number or vessel registration ID."""
    clean_id = (identifier or "").strip()
    if not clean_id:
        return None

    # Try PostgreSQL
    pg = get_pg_connection()
    if pg:
        try:
            with pg.cursor() as cur:
                cur.execute("""
                    SELECT id, full_name, phone, vessel_id, home_port, role, password_hash, is_verified, created_at 
                    FROM orca_registered_users 
                    WHERE phone = %s OR LOWER(vessel_id) = LOWER(%s);
                """, (clean_id, clean_id))
                row = cur.fetchone()
                if row:
                    return dict(row)
        except Exception as e:
            logger.warning(f"[Auth DB PG Query Error]: {e}")
        finally:
            pg.close()

    # Fallback to SQLite
    try:
        sq = get_sqlite_connection()
        cur = sq.cursor()
        cur.execute("""
            SELECT id, full_name, phone, vessel_id, home_port, role, password_hash, is_verified, created_at 
            FROM orca_registered_users 
            WHERE phone = ? OR LOWER(vessel_id) = LOWER(?);
        """, (clean_id, clean_id))
        row = cur.fetchone()
        sq.close()
        return dict(row) if row else None
    except Exception as e:
        logger.error(f"[Auth DB SQLite Query Error]: {e}")
        return None

def create_user(full_name: str, phone: str, vessel_id: str, home_port: str, role: str, password_hash: str) -> Optional[Dict[str, Any]]:
    """Persist a new registered user in database."""
    clean_phone = (phone or "").strip()
    clean_vessel = vessel_id.strip() if vessel_id else f"VESSEL-{clean_phone[-4:]}"

    # Try PostgreSQL
    pg = get_pg_connection()
    if pg:
        try:
            with pg.cursor() as cur:
                cur.execute("""
                    INSERT INTO orca_registered_users (full_name, phone, vessel_id, home_port, role, password_hash, is_verified)
                    VALUES (%s, %s, %s, %s, %s, %s, TRUE)
                    RETURNING id, full_name, phone, vessel_id, home_port, role, created_at;
                """, (full_name.strip(), clean_phone, clean_vessel, home_port, role, password_hash))
                user = cur.fetchone()
                pg.commit()
                return dict(user)
        except Exception as e:
            logger.warning(f"[Auth PG Insert Error]: {e}")
            pg.rollback()
        finally:
            pg.close()

    # Fallback to SQLite
    try:
        sq = get_sqlite_connection()
        with sq:
            cur = sq.cursor()
            cur.execute("""
                INSERT INTO orca_registered_users (full_name, phone, vessel_id, home_port, role, password_hash, is_verified)
                VALUES (?, ?, ?, ?, ?, ?, 1);
            """, (full_name.strip(), clean_phone, clean_vessel, home_port, role, password_hash))
            new_id = cur.lastrowid
            cur.execute("SELECT id, full_name, phone, vessel_id, home_port, role, created_at FROM orca_registered_users WHERE id = ?;", (new_id,))
            user = cur.fetchone()
        sq.close()
        return dict(user) if user else None
    except Exception as e:
        logger.error(f"[Auth SQLite Insert Error]: {e}")
        return None


# ---------------------------------------------------------------------------
# 4. Session Management
# ---------------------------------------------------------------------------

def create_user_session(user_id: int) -> Tuple[str, int]:
    """Issue a new session token with 7-day expiry."""
    token = generate_session_token()
    now = int(time.time())
    expires_at = now + SESSION_EXPIRY_SECONDS
    expires_iso = time.strftime('%Y-%m-%d %H:%M:%S', time.gmtime(expires_at))

    # PostgreSQL
    pg = get_pg_connection()
    if pg:
        try:
            with pg.cursor() as cur:
                cur.execute("""
                    INSERT INTO orca_active_sessions (token, user_id, expires_at)
                    VALUES (%s, %s, %s);
                """, (token, user_id, expires_iso))
                pg.commit()
            pg.close()
            return token, expires_at
        except Exception as e:
            logger.warning(f"[Auth PG Session Save Error]: {e}")
            if pg:
                pg.close()

    # SQLite
    try:
        sq = get_sqlite_connection()
        with sq:
            sq.execute("""
                INSERT INTO orca_active_sessions (token, user_id, expires_at)
                VALUES (?, ?, ?);
            """, (token, user_id, expires_iso))
        sq.close()
    except Exception as e:
        logger.error(f"[Auth SQLite Session Save Error]: {e}")

    return token, expires_at

def get_session_user(token: str) -> Optional[Dict[str, Any]]:
    """Validate session token and return user profile."""
    if not token:
        return None
    now_iso = time.strftime('%Y-%m-%d %H:%M:%S', time.gmtime())

    # PostgreSQL
    pg = get_pg_connection()
    if pg:
        try:
            with pg.cursor() as cur:
                cur.execute("""
                    SELECT u.id, u.full_name, u.phone, u.vessel_id, u.home_port, u.role, u.created_at
                    FROM orca_active_sessions s
                    JOIN orca_registered_users u ON s.user_id = u.id
                    WHERE s.token = %s AND s.expires_at > %s;
                """, (token, now_iso))
                row = cur.fetchone()
                if row:
                    return dict(row)
        except Exception as e:
            logger.warning(f"[Auth PG Session Check Error]: {e}")
        finally:
            pg.close()

    # SQLite
    try:
        sq = get_sqlite_connection()
        cur = sq.cursor()
        cur.execute("""
            SELECT u.id, u.full_name, u.phone, u.vessel_id, u.home_port, u.role, u.created_at
            FROM orca_active_sessions s
            JOIN orca_registered_users u ON s.user_id = u.id
            WHERE s.token = ? AND s.expires_at > ?;
        """, (token, now_iso))
        row = cur.fetchone()
        sq.close()
        return dict(row) if row else None
    except Exception as e:
        logger.error(f"[Auth SQLite Session Check Error]: {e}")
        return None

def delete_user_session(token: str) -> bool:
    """Invalidate session token on logout."""
    if not token:
        return True

    pg = get_pg_connection()
    if pg:
        try:
            with pg.cursor() as cur:
                cur.execute("DELETE FROM orca_active_sessions WHERE token = %s;", (token,))
                pg.commit()
            pg.close()
        except Exception:
            if pg:
                pg.close()

    try:
        sq = get_sqlite_connection()
        with sq:
            sq.execute("DELETE FROM orca_active_sessions WHERE token = ?;", (token,))
        sq.close()
        return True
    except Exception:
        return False


# ---------------------------------------------------------------------------
# 5. OTP Issuance & Verification Lifecycle
# ---------------------------------------------------------------------------

def request_otp_challenge(phone: str, purpose: str = "login", temp_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Generate an expiring 6-digit OTP for a phone number.
    Returns session challenge metadata and development OTP for immediate testing.
    """
    clean_phone = (phone or "").strip().replace(" ", "").replace("-", "")
    if clean_phone.startswith("+91"):
        clean_phone = clean_phone[3:]

    if not clean_phone or len(clean_phone) < 10:
        return {"success": False, "error": "Please provide a valid 10-digit mobile number."}

    # Check existing attempts to prevent flooding (rate limit)
    now = time.time()
    existing = OTP_CACHE.get(clean_phone)
    if existing and now < existing["expiry"] and existing.get("attempts", 0) >= MAX_OTP_ATTEMPTS:
        remaining = int(existing["expiry"] - now)
        return {
            "success": False,
            "error": f"Too many failed OTP attempts. Please wait {remaining} seconds before requesting a new code.",
            "locked": True
        }

    otp_code = generate_crypto_otp()
    expiry_time = now + OTP_EXPIRY_SECONDS

    OTP_CACHE[clean_phone] = {
        "otp": otp_code,
        "expiry": expiry_time,
        "attempts": 0,
        "purpose": purpose,
        "temp_data": temp_data or {}
    }

    masked = f"******{clean_phone[-4:]}" if len(clean_phone) >= 4 else clean_phone
    logger.info(f"🔑 [ORCA OTP DISPATCH] Phone: {clean_phone} | Purpose: {purpose} | OTP: {otp_code} (Valid for 5 mins)")

    return {
        "success": True,
        "phone_masked": masked,
        "phone_raw": clean_phone,
        "purpose": purpose,
        "expires_in": OTP_EXPIRY_SECONDS,
        "dev_otp": otp_code,
        "message": f"6-digit OTP successfully sent to {masked}."
    }

def verify_otp_challenge(phone: str, entered_otp: str, purpose: str = "login") -> Dict[str, Any]:
    """
    Validate entered 6-digit OTP against active challenge.
    Handles attempt counters, expiry checks, and temporary registration commits.
    """
    clean_phone = (phone or "").strip().replace(" ", "").replace("-", "")
    if clean_phone.startswith("+91"):
        clean_phone = clean_phone[3:]
    clean_otp = (entered_otp or "").strip()

    record = OTP_CACHE.get(clean_phone)
    if not record:
        return {"success": False, "error": "No active OTP request found for this number. Please request a new OTP."}

    now = time.time()
    if now > record["expiry"]:
        OTP_CACHE.pop(clean_phone, None)
        return {"success": False, "error": "OTP has expired. Please request a new code."}

    if record["attempts"] >= MAX_OTP_ATTEMPTS:
        return {"success": False, "error": "Maximum attempts exceeded. Please request a new OTP."}

    record["attempts"] += 1

    # Verify code in constant time
    if not secrets.compare_digest(record["otp"], clean_otp):
        remaining_attempts = MAX_OTP_ATTEMPTS - record["attempts"]
        return {
            "success": False,
            "error": f"Incorrect OTP code. {remaining_attempts} attempts remaining."
        }

    # OTP Verified Successfully!
    temp_data = record.get("temp_data", {})
    OTP_CACHE.pop(clean_phone, None)

    # If purpose was signup, create the user now
    if purpose == "signup":
        full_name = temp_data.get("full_name")
        vessel_id = temp_data.get("vessel_id")
        home_port = temp_data.get("home_port", "chennai")
        role = temp_data.get("role", "fisher")
        password_hash = temp_data.get("password_hash")

        if not full_name or not password_hash:
            return {"success": False, "error": "Incomplete registration data."}

        new_user = create_user(full_name, clean_phone, vessel_id, home_port, role, password_hash)
        if not new_user:
            return {"success": False, "error": "Could not create user account. Phone or Vessel may already be registered."}

        token, expires_at = create_user_session(new_user["id"])
        return {
            "success": True,
            "message": "Account created and verified successfully!",
            "token": token,
            "expires_at": expires_at,
            "user": {
                "id": new_user["id"],
                "name": new_user["full_name"],
                "phone": new_user["phone"],
                "vessel": new_user.get("vessel_id"),
                "harbor": new_user.get("home_port", "chennai"),
                "role": new_user.get("role", "fisher")
            }
        }

    # If purpose was login, look up existing user
    user = find_user_by_identifier(clean_phone)
    if not user:
        return {"success": False, "error": "User account not found."}

    token, expires_at = create_user_session(user["id"])
    return {
        "success": True,
        "message": "Identity verified successfully. Welcome to ORCA!",
        "token": token,
        "expires_at": expires_at,
        "user": {
            "id": user["id"],
            "name": user["full_name"],
            "phone": user["phone"],
            "vessel": user.get("vessel_id"),
            "harbor": user.get("home_port", "chennai"),
            "role": user.get("role", "fisher")
        }
    }


# ---------------------------------------------------------------------------
# 6. Pre-seeded Demo Users (For instant evaluation & judge demonstration)
# ---------------------------------------------------------------------------

def seed_demo_accounts():
    """Ensure standard demo captain and coast guard officer exist for rapid testing."""
    # Demo 1: Fisherman Capt. R. Murugan (Vessel: IND-TN-02-MM-4421, Phone: 9840122481, PIN: 2026)
    u1 = find_user_by_identifier("9840122481")
    if not u1:
        create_user(
            full_name="Capt. R. Murugan",
            phone="9840122481",
            vessel_id="IND-TN-02-MM-4421",
            home_port="chennai",
            role="fisher",
            password_hash=hash_password("2026")
        )
        logger.info("[Auth] Demo Fisherman account seeded: 9840122481 (PIN: 2026)")

    # Demo 2: Coast Guard Officer (ID: ICG-SZ-4089, Phone: 9840533910, PIN: 2026)
    u2 = find_user_by_identifier("9840533910")
    if not u2:
        create_user(
            full_name="Duty Officer ICG-SZ-4089",
            phone="9840533910",
            vessel_id="ICG-SZ-4089",
            home_port="chennai",
            role="officer",
            password_hash=hash_password("2026")
        )
        logger.info("[Auth] Demo Coast Guard Officer seeded: 9840533910 (PIN: 2026)")

seed_demo_accounts()
