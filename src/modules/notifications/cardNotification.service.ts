import { Card } from '../projects/boards/columns/cards/card.model';
import { EmailService } from '../../services/email.service';
import logger from '../../utils/logger';

type PendingCard = {
  _id: { toString(): string };
  title: string;
  priority?: string;
  expectedDeliveryDate?: Date;
  createdAt: Date;
  createdBy?: { name?: string; email?: string } | null;
  assignedTo?: Array<{ _id?: { toString(): string }; name?: string; email?: string }>;
  columnId?: {
    name?: string;
    boardId?: {
      name?: string;
      projectId?: {
        _id?: { toString(): string };
        name?: string;
      } | null;
    } | null;
  } | null;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatDateTime = (date: Date) =>
  new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);

export class CardNotificationService {
  static async processPendingCardNotifications() {
    if (!EmailService.isConfigured()) {
      logger.warn('Skipping card notifications because SMTP configuration is missing');
      return;
    }

    const cutoff = new Date(Date.now() - 5 * 60 * 1000);
    const pendingCards = (await Card.find({
      ticketNotificationSentAt: null,
      deletedAt: null,
      compleatedAt: null,
      assignedTo: { $exists: true, $ne: [] },
    })
      .populate({
        path: 'columnId',
        select: 'name boardId',
        populate: {
          path: 'boardId',
          select: 'name projectId',
          populate: {
            path: 'projectId',
            select: 'name',
          },
        },
      })
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: 1 })
      .lean()) as PendingCard[];

    if (pendingCards.length === 0) {
      return;
    }

    const cardsByUser = new Map<
      string,
      {
        email: string;
        name: string;
        cardIds: Set<string>;
        cards: PendingCard[];
        latestCreatedAt: Date;
      }
    >();

    for (const card of pendingCards) {
      for (const assignee of card.assignedTo || []) {
        const userId = assignee?._id?.toString();
        const email = assignee?.email;
        if (!userId || !email) {
          continue;
        }

        const group = cardsByUser.get(userId) ?? {
          email,
          name: assignee?.name || email,
          cardIds: new Set<string>(),
          cards: [],
          latestCreatedAt: card.createdAt,
        };

        group.cardIds.add(card._id.toString());
        group.cards.push(card);
        if (card.createdAt > group.latestCreatedAt) {
          group.latestCreatedAt = card.createdAt;
        }
        cardsByUser.set(userId, group);
      }
    }

    if (cardsByUser.size === 0) {
      return;
    }

    for (const [userId, group] of cardsByUser.entries()) {
      if (group.latestCreatedAt > cutoff) {
        continue;
      }

      const batchTime = new Date();
      const subject = `New Tickets Assigned (${group.cards.length}) - ${formatDateTime(batchTime)}`;
      const lines = group.cards.map((card) => {
        const projectName = card.columnId?.boardId?.projectId?.name || 'Project';
        const boardName = card.columnId?.boardId?.name || 'Board';
        const columnName = card.columnId?.name || 'Column';
        const creatorName = card.createdBy?.name || card.createdBy?.email || 'Unknown user';
        const dueDate = card.expectedDeliveryDate
          ? `, due ${new Date(card.expectedDeliveryDate).toLocaleDateString('en-IN')}`
          : '';

        return `- ${card.title} [${card.priority || 'MEDIUM'}] in ${projectName} / ${boardName} / ${columnName}, created by ${creatorName}${dueDate}`;
      });

      const htmlList = group.cards
        .map((card) => {
          const projectName = escapeHtml(card.columnId?.boardId?.projectId?.name || 'Project');
          const boardName = escapeHtml(card.columnId?.boardId?.name || 'Board');
          const columnName = escapeHtml(card.columnId?.name || 'Column');
          const creatorName = escapeHtml(card.createdBy?.name || card.createdBy?.email || 'Unknown user');
          const dueDate = card.expectedDeliveryDate
            ? `<div><strong>Due:</strong> ${new Date(card.expectedDeliveryDate).toLocaleDateString('en-IN')}</div>`
            : '';

          return `
            <li style="margin-bottom: 12px;">
              <div><strong>${escapeHtml(card.title)}</strong></div>
              <div><strong>Priority:</strong> ${escapeHtml(card.priority || 'MEDIUM')}</div>
              <div><strong>Location:</strong> ${projectName} / ${boardName} / ${columnName}</div>
              <div><strong>Created By:</strong> ${creatorName}</div>
              ${dueDate}
            </li>
          `;
        })
        .join('');

      try {
        await EmailService.sendMail({
          to: [group.email],
          subject,
          text: `Hello ${group.name},\n\nYou have ${group.cards.length} new ticket(s) in this batch.\nBatch time: ${formatDateTime(batchTime)}\n\n${lines.join('\n')}`,
          html: `
            <div style="font-family: Arial, sans-serif; color: #1f2937;">
              <p>Hello <strong>${escapeHtml(group.name)}</strong>,</p>
              <p>You have <strong>${group.cards.length}</strong> new ticket(s) in this notification batch.</p>
              <p><strong>Batch time:</strong> ${escapeHtml(formatDateTime(batchTime))}</p>
              <div style="margin-top: 12px;">
                <ul>${htmlList}</ul>
              </div>
            </div>
          `,
        });
      } catch (error) {
        logger.error(`Failed to send new ticket notification email for user ${userId}`, error);
      }
    }

    const sentCardIds = Array.from(cardsByUser.values())
      .filter((group) => group.latestCreatedAt <= cutoff)
      .flatMap((group) => Array.from(group.cardIds));

    if (sentCardIds.length === 0) {
      return;
    }

    await Card.updateMany(
      { _id: { $in: sentCardIds } },
      { $set: { ticketNotificationSentAt: new Date() } }
    );
  }

  static async processDueReminderNotifications() {
    if (!EmailService.isConfigured()) {
      logger.warn('Skipping due reminder notifications because SMTP configuration is missing');
      return;
    }

    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() + 2);

    const end = new Date(start);
    end.setHours(23, 59, 59, 999);

    const dueCards = (await Card.find({
      expectedDeliveryDate: { $gte: start, $lte: end },
      dueReminderSentAt: null,
      deletedAt: null,
      compleatedAt: null,
      assignedTo: { $exists: true, $ne: [] },
    })
      .populate({
        path: 'columnId',
        select: 'name boardId',
        populate: {
          path: 'boardId',
          select: 'name projectId',
          populate: {
            path: 'projectId',
            select: 'name',
          },
        },
      })
      .populate('assignedTo', 'name email')
      .sort({ expectedDeliveryDate: 1 })
      .lean()) as PendingCard[];

    if (dueCards.length === 0) {
      return;
    }

    const remindersByUser = new Map<
      string,
      {
        email: string;
        name: string;
        cardIds: Set<string>;
        cards: PendingCard[];
      }
    >();

    for (const card of dueCards) {
      for (const assignee of card.assignedTo || []) {
        const userId = assignee?._id?.toString();
        const email = assignee?.email;
        if (!userId || !email) {
          continue;
        }

        const group = remindersByUser.get(userId) ?? {
          email,
          name: assignee?.name || email,
          cardIds: new Set<string>(),
          cards: [],
        };

        group.cardIds.add(card._id.toString());
        group.cards.push(card);
        remindersByUser.set(userId, group);
      }
    }

    if (remindersByUser.size === 0) {
      return;
    }

    for (const [userId, group] of remindersByUser.entries()) {
      const subject = `Reminder: ${group.cards.length} ticket${group.cards.length > 1 ? 's are' : ' is'} due in 2 days`;
      const lines = group.cards.map((card) => {
        const projectName = card.columnId?.boardId?.projectId?.name || 'Project';
        const boardName = card.columnId?.boardId?.name || 'Board';
        const columnName = card.columnId?.name || 'Column';
        const dueDate = card.expectedDeliveryDate
          ? new Date(card.expectedDeliveryDate).toLocaleDateString('en-IN')
          : 'N/A';

        return `- ${card.title} in ${projectName} / ${boardName} / ${columnName}, due on ${dueDate}`;
      });

      const htmlList = group.cards
        .map((card) => {
          const projectName = escapeHtml(card.columnId?.boardId?.projectId?.name || 'Project');
          const boardName = escapeHtml(card.columnId?.boardId?.name || 'Board');
          const columnName = escapeHtml(card.columnId?.name || 'Column');
          const dueDate = card.expectedDeliveryDate
            ? new Date(card.expectedDeliveryDate).toLocaleDateString('en-IN')
            : 'N/A';

          return `
            <li style="margin-bottom: 12px;">
              <div><strong>${escapeHtml(card.title)}</strong></div>
              <div><strong>Location:</strong> ${projectName} / ${boardName} / ${columnName}</div>
              <div><strong>Due:</strong> ${escapeHtml(dueDate)}</div>
            </li>
          `;
        })
        .join('');

      try {
        await EmailService.sendMail({
          to: [group.email],
          subject,
          text: `Hello ${group.name},\n\nThese tickets are due in 2 days:\n${lines.join('\n')}`,
          html: `
            <div>
              <p>Hello <strong>${escapeHtml(group.name)}</strong>,</p>
              <p>The following tickets are due in 2 days:</p>
              <ul>${htmlList}</ul>
            </div>
          `,
        });
      } catch (error) {
        logger.error(`Failed to send due reminder email for user ${userId}`, error);
      }
    }

    await Card.updateMany(
      { _id: { $in: dueCards.map((card) => card._id) } },
      { $set: { dueReminderSentAt: new Date() } }
    );
  }
}
