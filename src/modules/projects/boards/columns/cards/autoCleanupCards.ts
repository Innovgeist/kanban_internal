import { Column } from '../column.model';
import { Card } from './card.model';

export async function autoCleanupCards(columnId: any) {
  const column = await Column.findById(columnId).lean();
  if (!column) return;

  const mode = column.autoCleanupMode;
  const days = column.autoCleanupAfterDays;

  if (!mode || !days || days <= 0) return;

  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // only cards that were actually completed and are older than cutoff
  const query = {
    columnId: column._id,
    completedAt: { $ne: null, $lte: cutoff },
  };

  if (mode === 'HIDE') {
    await Card.updateMany(
      { ...query, isHidden: false },
      { $set: { isHidden: true } }
    );
  }

  if (mode === 'DELETE') {
    // hard delete:
    await Card.deleteMany(query);

    // OR soft delete option:
    // await Card.updateMany(query, { $set: { deletedAt: new Date() } });
  }
}
