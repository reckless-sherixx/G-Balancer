# database/db.py
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from sqlalchemy import Column, Integer, Float, String, DateTime, Boolean, text
from datetime import datetime
from config import settings
import enum

# ─── Engine ───────────────────────────────────────────────────────────
engine = create_async_engine(settings.DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

# ─── ORM Models ───────────────────────────────────────────────────────
class GridStateDB(Base):
    __tablename__ = "grid_states"
    id                        = Column(Integer, primary_key=True, index=True)
    timestamp                 = Column(DateTime, default=datetime.utcnow, index=True)
    city                      = Column(String, index=True)
    current_demand_mw         = Column(Float)
    solar_generation_mw       = Column(Float)
    wind_generation_mw        = Column(Float)
    conventional_generation_mw = Column(Float)
    total_supply_mw           = Column(Float)
    net_balance_mw            = Column(Float)
    battery_level_mwh         = Column(Float)
    battery_percentage        = Column(Float)
    battery_status            = Column(String)
    grid_status               = Column(String)
    recommended_action        = Column(String)
    action_description        = Column(String)

class AlertDB(Base):
    __tablename__ = "alerts"
    id                 = Column(Integer, primary_key=True, index=True)
    timestamp          = Column(DateTime, default=datetime.utcnow, index=True)
    city               = Column(String, index=True)
    severity           = Column(String)
    title              = Column(String)
    message            = Column(String)
    recommended_action = Column(String)
    is_resolved        = Column(Boolean, default=False)

# ─── Helpers ──────────────────────────────────────────────────────────
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Database initialized")

async def migrate_add_battery_status():
    """Migrate existing database to add battery_status column if it doesn't exist"""
    async with engine.begin() as conn:
        try:
            table_check = await conn.exec_driver_sql(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='grid_states'"
            )
            if not table_check.first():
                print("ℹ️ grid_states table not found yet; skipping battery_status migration")
                return

            col_info = await conn.exec_driver_sql("PRAGMA table_info(grid_states)")
            col_names = {row[1] for row in col_info.fetchall()}

            if "battery_status" not in col_names:
                await conn.exec_driver_sql(
                    "ALTER TABLE grid_states ADD COLUMN battery_status VARCHAR"
                )
                print("✅ Added battery_status column to grid_states")
            else:
                print("✅ battery_status column already exists")
        except Exception as e:
            print(f"⚠️ Migration note: {e}")
