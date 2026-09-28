from collections.abc import AsyncGenerator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.payments.core.config import payment_settings

payments_engine = create_async_engine(
    payment_settings.payments_database_url,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=5,
)
PaymentSession = async_sessionmaker(payments_engine, expire_on_commit=False)


async def get_payment_session() -> AsyncGenerator[AsyncSession, None]:
    async with PaymentSession() as session:
        yield session


async def check_payment_database() -> None:
    async with payments_engine.connect() as connection:
        await connection.execute(text("SELECT 1"))
