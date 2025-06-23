import express, { Response } from 'express';
import {
  saveChat,
  createMessage,
  addMessageToChat,
  getChat,
  addParticipantToChat,
  getChatsByParticipants,
} from '../services/chat.service';
import { populateDocument } from '../utils/database.util';
import {
  CreateChatRequest,
  AddMessageRequestToChat,
  AddParticipantRequest,
  ChatIdRequest,
  GetChatByParticipantsRequest,
} from '../types/chat';
import { FakeSOSocket } from '../types/socket';

/*
 * This controller handles chat-related routes.
 * @param socket The socket instance to emit events.
 * @returns {express.Router} The router object containing the chat routes.
 * @throws {Error} Throws an error if the chat creation fails.
 */
const chatController = (socket: FakeSOSocket) => {
  const router = express.Router();

  /**
   * Validates that the request body contains all required fields for a chat.
   * @param req The incoming request containing chat data.
   * @returns `true` if the body contains valid chat fields; otherwise, `false`.
   */
  const isCreateChatRequestValid = (req: CreateChatRequest): boolean => {
    // DONE: Task 3 - Implement the isCreateChatRequestValid function.
    const { participants, messages } = req.body;
    return Array.isArray(participants) && participants.length > 0 && !!messages;
  };

  /**
   * Validates that the request body contains all required fields for a message.
   * @param req The incoming request containing message data.
   * @returns `true` if the body contains valid message fields; otherwise, `false`.
   */
  const isAddMessageRequestValid = (req: AddMessageRequestToChat): boolean => {
    // DONE: Task 3 - Implement the isAddMessageRequestValid function.
    const { chatId } = req.params;
    const { msg, msgFrom } = req.body;
    return !!chatId && !!msg && !!msgFrom;
  };

  /**
   * Validates that the request body contains all required fields for a participant.
   * @param req The incoming request containing participant data.
   * @returns `true` if the body contains valid participant fields; otherwise, `false`.
   */
  const isAddParticipantRequestValid = (req: AddParticipantRequest): boolean => {
    // DONE: Task 3 - Implement the isAddParticipantRequestValid function.
    const { chatId } = req.params;
    const { participant } = req.body;
    return !!chatId && !!participant;
  };

  /**
   * Creates a new chat with the given participants (and optional initial messages).
   * @param req The request object containing the chat data.
   * @param res The response object to send the result.
   * @returns {Promise<void>} A promise that resolves when the chat is created.
   * @throws {Error} Throws an error if the chat creation fails.
   */
  const createChatRoute = async (req: CreateChatRequest, res: Response): Promise<void> => {
    // DONE: Task 3 - Implement the createChatRoute function
    // Emit a `chatUpdate` event to share the creation of a new chat
    const { participants, messages } = req.body;

    if (!req.body || !isCreateChatRequestValid(req)) {
      res.status(400).send('Invalid request for creating chat');
      return;
    }

    try {
      const createdChat = await saveChat({ participants, messages });

      if ('error' in createdChat) {
        throw new Error(createdChat.error);
      }

      const populatedChat = await populateDocument(createdChat._id?.toString(), 'chat');

      socket.emit('chatUpdate', { chat: populatedChat, type: 'created' });
      res.json(populatedChat);
    } catch (err: unknown) {
      res.status(500).send(`Error occurred while creating a chat: ${(err as Error).message}`);
    }
  };

  /**
   * Adds a new message to an existing chat.
   * @param req The request object containing the message data.
   * @param res The response object to send the result.
   * @returns {Promise<void>} A promise that resolves when the message is added.
   * @throws {Error} Throws an error if the message addition fails.
   */
  const addMessageToChatRoute = async (
    req: AddMessageRequestToChat,
    res: Response,
  ): Promise<void> => {
    // DONE: Task 3 - Implement the addMessageToChatRoute function
    // Emit a `chatUpdate` event to share the updated chat, specifically to
    // the chat room where the message was added (hint: look into socket rooms)
    // NOTE: Make sure to define the message type to be a direct message when creating it.
    if (!req.body || !isAddMessageRequestValid(req)) {
      res.status(400).send('Invalid request body');
      return;
    }
    const { chatId } = req.params;
    const { msg, msgFrom, msgDateTime } = req.body;

    try {
      const newMessage = await createMessage({
        msg,
        msgFrom,
        msgDateTime: msgDateTime || new Date(),
        type: 'direct',
      });
      if ('error' in newMessage) {
        throw new Error(newMessage.error);
      }

      if (!newMessage._id) {
        throw new Error('_id missing from new message');
      }

      const updatedChat = await addMessageToChat(chatId, newMessage._id.toString());

      if ('error' in updatedChat) {
        throw new Error(updatedChat.error);
      }

      const populatedChat = await populateDocument(updatedChat._id?.toString(), 'chat');

      socket.to(chatId).emit('chatUpdate', { chat: populatedChat, type: 'newMessage' });
      res.json(populatedChat);
    } catch (err: unknown) {
      res
        .status(500)
        .send(`Error occurred while adding a message to the chat: ${(err as Error).message}`);
    }
  };

  /**
   * Retrieves a chat by its ID, optionally populating participants and messages.
   * @param req The request object containing the chat ID.
   * @param res The response object to send the result.
   * @returns {Promise<void>} A promise that resolves when the chat is retrieved.
   * @throws {Error} Throws an error if the chat retrieval fails.
   */
  const getChatRoute = async (req: ChatIdRequest, res: Response): Promise<void> => {
    // DONE: Task 3 - Implement the getChatRoute function
    const { chatId } = req.params;

    try {
      const chat = await getChat(chatId);

      if ('error' in chat) {
        throw new Error(chat.error);
      }

      const populatedChat = await populateDocument(chat._id?.toString(), 'chat');

      if ('error' in populatedChat) {
        throw new Error(populatedChat.error);
      }

      res.json(populatedChat);
    } catch (err: unknown) {
      res.status(500).send(`Error occurred while retrieving the chat: ${(err as Error).message}`);
    }
  };

  /**
   * Retrieves chats for a user based on their username.
   * @param req The request object containing the username parameter in `req.params`.
   * @param res The response object to send the result, either the populated chats or an error message.
   * @returns {Promise<void>} A promise that resolves when the chats are successfully retrieved and populated.
   */
  const getChatsByUserRoute = async (
    req: GetChatByParticipantsRequest,
    res: Response,
  ): Promise<void> => {
    // DONE: Task 3 - Implement the getChatsByUserRoute function
    const { username } = req.params;

    try {
      const chats = await getChatsByParticipants([username]);

      const populatedChats = await Promise.all(
        chats.map(chat => populateDocument(chat._id?.toString(), 'chat')),
      );

      if (populatedChats.some(chat => 'error' in chat)) {
        throw new Error('Failed to populate all fetched chats');
      }

      res.json(populatedChats);
    } catch (err: unknown) {
      res.status(500).send(`Error occurred while retrieving chats: ${(err as Error).message}`);
    }
  };

  /**
   * Adds a participant to an existing chat.
   * @param req The request object containing the participant data.
   * @param res The response object to send the result.
   * @returns {Promise<void>} A promise that resolves when the participant is added.
   * @throws {Error} Throws an error if the participant addition fails.
   */
  const addParticipantToChatRoute = async (
    req: AddParticipantRequest,
    res: Response,
  ): Promise<void> => {
    // DONE: Task 3 - Implement the addParticipantToChatRoute function
    if (!req.body || !isAddParticipantRequestValid(req)) {
      res.status(400).send('Invalid request body');
      return;
    }

    const { chatId } = req.params;
    const { participant } = req.body;

    try {
      const chat = await addParticipantToChat(chatId, participant);

      if ('error' in chat) {
        throw new Error(chat.error);
      }

      socket.emit('chatUpdate', { chat, type: 'newParticipant' });
      res.json(chat);
    } catch (err: unknown) {
      res
        .status(500)
        .send(`Error occurred while adding participant to chat: ${(err as Error).message}`);
    }
  };

  socket.on('connection', conn => {
    // DONE: Task 3 - Implement the `joinChat` event listener on `conn`
    // The socket room will be defined to have the chat ID as the room name
    // TODO: Task 3 - Implement the `leaveChat` event listener on `conn`
    // You should only leave the chat if the chat ID is provided/defined
    conn.on('joinChat', (chatID: string) => {
      conn.join(chatID);
    });

    conn.on('leaveChat', (chatID: string | undefined) => {
      if (chatID) {
        conn.leave(chatID);
      }
    });
  });

  // Register the routes
  // DONE: Task 3 - Add appropriate HTTP verbs and endpoints to the router
  router.get('/:chatId', getChatRoute);
  router.get('/getChatsByUser/:username', getChatsByUserRoute);
  router.post('/createChat', createChatRoute);
  router.post('/:chatId/addMessage', addMessageToChatRoute);
  router.post('/:chatId/addParticipant', addParticipantToChatRoute);

  return router;
};

export default chatController;
