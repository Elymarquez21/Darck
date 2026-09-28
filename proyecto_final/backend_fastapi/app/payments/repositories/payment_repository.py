from uuid import UUID

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.payments.models.payment import Payment, PaymentWebhookEvent


class PaymentRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def add(self, payment: Payment) -> Payment:
        self.session.add(payment)
        await self.session.flush()
        return payment

    async def by_id(self, payment_id: UUID) -> Payment | None:
        return await self.session.get(Payment, payment_id)

    async def by_reference(self, reference: str) -> Payment | None:
        return await self.session.scalar(select(Payment).where(Payment.reference == reference))

    async def by_provider_transaction(self, transaction_id: str) -> Payment | None:
        return await self.session.scalar(
            select(Payment).where(Payment.provider_transaction_id == transaction_id)
        )

    async def by_idempotency_key(self, idempotency_key: str) -> Payment | None:
        return await self.session.scalar(select(Payment).where(Payment.idempotency_key == idempotency_key))

    async def add_webhook_event(self, event: PaymentWebhookEvent) -> bool:
        statement = (
            insert(PaymentWebhookEvent)
            .values(
                id=event.id,
                event_hash=event.event_hash,
                provider=event.provider,
                event_type=event.event_type,
                payment_id=event.payment_id,
                provider_transaction_id=event.provider_transaction_id,
                reference=event.reference,
                payload=event.payload,
            )
            .on_conflict_do_nothing(index_elements=["event_hash"])
        )
        result = await self.session.execute(statement)
        return result.rowcount == 1
