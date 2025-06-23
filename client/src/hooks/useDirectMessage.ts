import { useEffect, useState } from 'react';
import { Chat, ChatUpdatePayload, Message, User } from '../types';
import useUserContext from './useUserContext';
import { createChat, getChatById, getChatsByUser, sendMessage } from '../services/chatService';

/**
 * useDirectMessage is a custom hook that provides state and functions for direct messaging between users.
 * It includes a selected user, messages, and a new message state.
 */

const useDirectMessage = () => {
  const { user, socket } = useUserContext();
  const [showCreatePanel, setShowCreatePanel] = useState<boolean>(false);
  const [chatToCreate, setChatToCreate] = useState<string>('');
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [newMessage, setNewMessage] = useState('');

  const handleJoinChat = (chatID: string) => {
    // DONE: Task 3 - Emit a 'joinChat' event to the socket with the chat ID function argument.
    socket.emit('joinChat', chatID);
  };

  const handleSendMessage = async () => {
    // DONE: Task 3 - Implement the send message handler function.
    // Whitespace-only messages should not be sent, and the current chat to send this message to
    // should be defined. Use the appropriate service function to make an API call, and update the
    // states accordingly.
    if (newMessage.trim() && selectedChat?._id) {
      const message: Omit<Message, 'type'> = {
        msg: newMessage,
        msgFrom: user.username,
        msgDateTime: new Date(),
      };

      const chat = await sendMessage(message, selectedChat._id);

      setSelectedChat(chat);
      setNewMessage('');
    }
  };

  const handleChatSelect = async (chatID: string | undefined) => {
    // DONE: Task 3 - Implement the chat selection handler function.
    // If the chat ID is defined, fetch the chat details using the appropriate service function,
    // and update the appropriate state variables. Make sure the client emits a socket event to
    // subscribe to the chat room.
    if (chatID) {
      const chat = await getChatById(chatID);
      setSelectedChat(chat);
      handleJoinChat(chatID);
    }
  };

  const handleUserSelect = (selectedUser: User) => {
    setChatToCreate(selectedUser.username);
  };

  const handleCreateChat = async () => {
    // DONE: Task 3 - Implement the create chat handler function.
    // If the username to create a chat is defined, use the appropriate service function to create a new chat
    // between the current user and the chosen user. Update the appropriate state variables and emit a socket
    // event to join the chat room. Hide the create panel after creating the chat.
    if (chatToCreate) {
      const chat = await createChat([user.username, chatToCreate]);
      setSelectedChat(chat);
      handleJoinChat(chat._id);
      setShowCreatePanel(false);
      setChatToCreate('');
    }
  };

  useEffect(() => {
    const fetchChats = async () => {
      // DONE: Task 3 - Fetch all the chats with the current user and update the state variable.
      const userChats = await getChatsByUser(user.username);
      setChats(userChats);
    };

    const handleChatUpdate = (chatUpdate: ChatUpdatePayload) => {
      // DONE: Task 3 - Implement the chat update handler function.
      // This function is responsible for updating the state variables based on the
      // socket events received. The function should handle the following cases:
      // - A new chat is created (add the chat to the current list of chats)
      // - A new message is received (update the selected chat with the new message)
      // - Throw an error for an invalid chatUpdate type
      // NOTE: For new messages, the user will only receive the update if they are
      // currently subscribed to the chat room.
      const { chat, type } = chatUpdate;

      switch (type) {
        case 'created': {
          if (chat.participants.includes(user.username)) {
            setChats(prevChats => [chat, ...prevChats]);
          }
          return;
        }
        case 'newMessage': {
          setSelectedChat(chat);
          return;
        }
        default: {
          throw new Error('Invalid chat update type');
        }
      }
    };

    fetchChats();

    // DONE: Task 3 - Register the 'chatUpdate' event listener
    socket.on('chatUpdate', handleChatUpdate);

    return () => {
      // DONE: Task 3 - Unsubscribe from the socket event
      socket.off('chatUpdate', handleChatUpdate);
      // DONE: Task 3 - Emit a socket event to leave the particular chat room
      // they are currently in when the component unmounts.
      if (selectedChat?._id) {
        socket.emit('leaveChat', selectedChat._id);
      }
    };
  }, [user.username, socket, selectedChat?._id]);

  return {
    selectedChat,
    chatToCreate,
    chats,
    newMessage,
    setNewMessage,
    showCreatePanel,
    setShowCreatePanel,
    handleSendMessage,
    handleChatSelect,
    handleUserSelect,
    handleCreateChat,
  };
};

export default useDirectMessage;
