const Conversation = require('../models/Conversation');
const User = require('../models/User');

async function recalculateSellerResponseStats(sellerId) {
  const conversations = await Conversation.find({ seller: sellerId });
  if (conversations.length === 0) return;

  const responded      = conversations.filter(c => c.firstResponseAt != null);
  const respondedIn48h = conversations.filter(c => c.respondedWithin48h === true);

  const responseRate = Math.round((respondedIn48h.length / conversations.length) * 100);

  const avgMs = responded.length > 0
    ? responded.reduce((sum, c) => sum + (c.firstResponseAt - c.inquiryCreatedAt), 0) / responded.length
    : null;

  const averageResponseTimeHours = avgMs != null
    ? Math.round((avgMs / 3_600_000) * 10) / 10
    : null;

  const lastResponseAt = responded.length > 0
    ? responded.reduce(
        (latest, c) => c.firstResponseAt > latest ? c.firstResponseAt : latest,
        responded[0].firstResponseAt
      )
    : null;

  const update = { responseRate };
  if (averageResponseTimeHours != null) update.averageResponseTimeHours = averageResponseTimeHours;
  if (lastResponseAt)                  update.lastResponseAt = lastResponseAt;

  await User.findByIdAndUpdate(sellerId, update);
}

module.exports = { recalculateSellerResponseStats };
