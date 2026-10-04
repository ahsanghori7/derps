import { 
    getRequestWithOutBody, 
    postRequestWithBodyAndToken, 
    postRequestWithFormData,
    putRequestWithBodyAndToken,
    patchRequestWithBodyAndToken,
    deleteRequestWithBody,
    deleteRequest
} from '@api/fetch';
import { baseURl } from '../../../Config/systemConfig';

// Ensure proper URL formatting
const CHAT_API_BASE = `${baseURl.replace(/\/$/, '')}/chat`;

/**
 * Chat API Service
 * All endpoints follow the documentation in chat.txt
 */

// Create Direct Chat (1-on-1)
export const createDirectChat = async (token, memberIds) => {
    const url = `${CHAT_API_BASE}`;
    const body = {
        type: 'direct',
        memberIds: Array.isArray(memberIds) ? memberIds : [memberIds]
    };
    return await postRequestWithBodyAndToken(url, token, body);
};

// Create Group Chat
export const createGroupChat = async (token, { name, description, memberIds }) => {
    const url = `${CHAT_API_BASE}`;
    const body = {
        type: 'group',
        name,
        description,
        memberIds: Array.isArray(memberIds) ? memberIds : [memberIds]
    };
    return await postRequestWithBodyAndToken(url, token, body);
};

// List All Chats
export const getChats = async (token, page = 1, limit = 20, keyword) => {
    const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(keyword?.trim() ? { keyword: keyword.trim() } : {}),
    });

    const url = `${CHAT_API_BASE}?${params.toString()}`;
    return await getRequestWithOutBody(url, token);
};

// View Chat Details
export const getChatDetails = async (token, chatId) => {
    const url = `${CHAT_API_BASE}/${chatId}`;
    return await getRequestWithOutBody(url, token);
};

// Forward Message to one or more chats
export const forwardMessage = async (token, { messageId, chatIds, clientMessageIds }) => {
    const url = `${CHAT_API_BASE}/messages/forward`;
    const body = {
        messageId: parseInt(messageId, 10),
        chatIds: (Array.isArray(chatIds) ? chatIds : [chatIds]).map((id) =>
            parseInt(id, 10),
        ),
        ...(clientMessageIds && { clientMessageIds }),
    };
    return await postRequestWithBodyAndToken(url, token, body);
};

// Send Message (optional scheduledAt for deferred delivery)
export const sendMessage = async (token, chatId, { content, type = 'text', replyToMessageId, attachments, scheduledAt }) => {
    const url = `${CHAT_API_BASE}/${chatId}/messages`;
    const body = {
        chatId: parseInt(chatId),
        content,
        type,
        ...(replyToMessageId && { replyToMessageId }),
        ...(attachments && { attachments }),
        ...(scheduledAt && { scheduledAt }),
    };
    return await postRequestWithBodyAndToken(url, token, body);
};

// Get auto-reply (out-of-office) settings for the current user
export const getAutoReplySettings = async (token) => {
    const url = `${CHAT_API_BASE}/auto-reply`;
    return await getRequestWithOutBody(url, token);
};

// Update auto-reply settings
export const updateAutoReplySettings = async (token, settings) => {
    const url = `${CHAT_API_BASE}/auto-reply`;
    return await putRequestWithBodyAndToken(url, token, settings);
};

// Get Messages (Chat History)
export const getMessages = async (token, chatId, page = 1, limit = 50, options = {}) => {
    const url = `${CHAT_API_BASE}/${chatId}/messages?page=${page}&limit=${limit}`;
    return await getRequestWithOutBody(url, token, options);
};

// Search messages in full chat history with contextual messages
export const searchChatMessages = async (
    token,
    chatId,
    { keyword, contextBefore = 5, contextAfter = 5 } = {},
) => {
    const params = new URLSearchParams({
        keyword: keyword || "",
        contextBefore: String(contextBefore),
        contextAfter: String(contextAfter),
    });
    const url = `${CHAT_API_BASE}/${chatId}/messages/search?${params.toString()}`;
    return await getRequestWithOutBody(url, token);
};

// Upload File Attachment
export const uploadAttachment = async (token, file) => {
    const url = `${CHAT_API_BASE}/upload-attachment`;
    const formData = new FormData();
    formData.append('file', file);
    return await postRequestWithFormData(url, token, formData);
};

// Get Attachment File (for display/download)
export const getAttachmentUrl = (filename) => {
    // Return the URL string directly - the API streams the file
    // Encode to safely support spaces, #, $, etc.
    if (!filename) return `${CHAT_API_BASE}/attachments/`;
    return `${CHAT_API_BASE}/attachments/?filepath=${encodeURIComponent(filename)}`;
};

// Add Group Member
export const addGroupMember = async (token, chatId, userId) => {
    const url = `${CHAT_API_BASE}/${chatId}/members`;
    const body = { userId };
    return await postRequestWithBodyAndToken(url, token, body);
};

// Remove Group Member
export const removeGroupMember = async (token, chatId, userId) => {
    const url = `${CHAT_API_BASE}/${chatId}/members`;
    const body = { userId };
    return await deleteRequestWithBody(url, token, body);
};

// Update Group Member Role (admin | member)
export const updateGroupMemberRole = async (token, chatId, { userId, role }) => {
    const url = `${CHAT_API_BASE}/${chatId}/members`;
    const body = { userId, role };
    return await patchRequestWithBodyAndToken(url, token, body);
};

// Leave Group (self)
export const leaveGroup = async (token, chatId) => {
    const url = `${CHAT_API_BASE}/${chatId}/leave`;
    return await postRequestWithBodyAndToken(url, token, {});
};

// Mute/Unmute Group Notifications (self)
export const muteGroupChat = async (token, chatId, isMuted) => {
    const url = `${CHAT_API_BASE}/${chatId}/mute`;
    return await patchRequestWithBodyAndToken(url, token, { isMuted });
};

// Update Group Details
export const updateGroupDetails = async (token, chatId, { name, description }) => {
    const url = `${CHAT_API_BASE}/${chatId}`;
    const body = {};
    if (name) body.name = name;
    if (description) body.description = description;
    return await putRequestWithBodyAndToken(url, token, body);
};

// Mark Chat as Read
export const markChatAsRead = async (token, chatId) => {
    const url = `${CHAT_API_BASE}/${chatId}/mark-as-read`;
    return await postRequestWithBodyAndToken(url, token, {});
};

// Delete Message
export const deleteMessage = async (token, chatId, messageId) => {
    const url = `${CHAT_API_BASE}/${chatId}/messages/${messageId}`;
    return await deleteRequest(url, token);
};

// Edit/Update Message
export const updateMessage = async (token, chatId, messageId, { content }) => {
    const url = `${CHAT_API_BASE}/${chatId}/messages/${messageId}`;
    const body = { content };
    return await patchRequestWithBodyAndToken(url, token, body);
};

// Add Reaction to a message
export const addMessageReaction = async (token, chatId, messageId, emoji) => {
    const url = `${CHAT_API_BASE}/${chatId}/messages/${messageId}/reactions`;
    return await postRequestWithBodyAndToken(url, token, { emoji });
};

// Remove Reaction from a message
export const removeMessageReaction = async (token, chatId, messageId, emoji) => {
    const url = `${CHAT_API_BASE}/${chatId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`;
    return await deleteRequest(url, token);
};

// List scheduled (deferred) messages for a chat
export const getScheduledMessages = async (token, chatId) => {
    const url = `${CHAT_API_BASE}/${chatId}/messages/scheduled`;
    return await getRequestWithOutBody(url, token);
};

// Update a scheduled message (content and/or send time)
export const updateScheduledMessage = async (
    token,
    chatId,
    scheduledMessageId,
    { content, scheduledAt } = {},
) => {
    const url = `${CHAT_API_BASE}/${chatId}/messages/scheduled/${scheduledMessageId}`;
    const body = {};
    if (content !== undefined) body.content = content;
    if (scheduledAt !== undefined) body.scheduledAt = scheduledAt;
    return await patchRequestWithBodyAndToken(url, token, body);
};

// Cancel / delete a scheduled message
export const deleteScheduledMessage = async (token, chatId, scheduledMessageId) => {
    const url = `${CHAT_API_BASE}/${chatId}/messages/scheduled/${scheduledMessageId}`;
    return await deleteRequest(url, token);
};
