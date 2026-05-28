const { registerDomainHandlers } = require('./registerDomainHandlers');

const getHashtagService = () => require('../services/hashtagService');
const getActor = (socket) => socket.userDetails || socket.user || {};

const registerHashtagHandlers = (socket) => {
  registerDomainHandlers(socket, [
    {
      event: 'hashtag:getAll',
      execute: async () => {
        const hashtags = await getHashtagService().getAllHashtags();
        return { hashtags };
      },
    },
    {
      event: 'hashtag:create',
      execute: async ({ payload }) => {
        const actor = getActor(socket);
        const hashtag = await getHashtagService().createHashtag(payload || {}, actor.user_id);
        return { message: 'Tạo hashtag thành công', hashtag };
      },
    },
  ]);
};

module.exports = { registerHashtagHandlers };
