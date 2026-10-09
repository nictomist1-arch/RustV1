<script setup lang="ts">

import type { User } from "./types/user";

import ProfilerEditor from "./components/ProfilerEditor.vue";
import ChatCreator from "./components/ChatCreator.vue";
import type { ChatCreate, ChatKind } from "./types/chats";

import type { ProfileUpdate } from "./types/user";
import type { PostComment } from "./types/comment";
import AuthScreen from "./components/AuthScreen.vue";
import { authenticate } from "./services/auth";
import type { AuthCredentials } from "./types/auth";

const authReady = ref(false);
const authBusy = ref(false);
const authError = ref("");
const isLoadingChat = ref(false);
const isSending = ref(false);
const isSavingProfile = ref(false);

async function submitAuth(credentials: AuthCredentials){
  if (!db || !authReady.value || authBusy.value) return;
  authBusy.value = true;
  authError.value = "";

  try {
    const user = await authenticate(db, credentials);
    await loadUsers();
    currentUser.value = users.value.find(item => item.id === user.id) ?? user;
    await loadChats();
    if (chats.value[0]) await selectChat(chats.value[0]);
    status.value = "История сохраняется локально";
  } catch (error) {
    currentUser.value = null;
    chats.value = [];
    messages.value = [];
    comments.value = [];
    authError.value = error instanceof Error ? error.message : "Не удалось войти. Попробуйте ещё раз.";
  } finally {
    authBusy.value = false;
  }
}

const sessionBusy = computed(() => {
  return authBusy.value || isLoadingChat.value || isSending.value || isSavingProfile.value
    || isSavingEdit.value || isCreatingChat.value || savingCommentPostId.value !== null;
});

function logout(){
  if (sessionBusy.value) return;
  cancelEditing();
  cancelComment();
  isProfileOpen.value = false;
  isChatCreatorOpen.value = false;
  currentUser.value = null;
  activeChat.value = null;
  activeChatId.value = 0;
  users.value = [];
  chats.value = [];
  messages.value = [];
  comments.value = [];
  authError.value = "";
}

const isProfileOpen = ref(false);
const isChatCreatorOpen = ref(false);
const isCreatingChat = ref(false);
const chatCreateError = ref("");
const creationKind = ref<ChatKind>("chat");

function openChatCreator(){
  creationKind.value = "chat";
  chatCreateError.value = "";
  isChatCreatorOpen.value = true;
}

function openChannelCreator(){
  creationKind.value = "channel";
  chatCreateError.value = "";
  isChatCreatorOpen.value = true;
}

function closeChatCreator(){
  if (!isCreatingChat.value){
    isChatCreatorOpen.value = false;
  }
}

async function createChat(draft: ChatCreate){
  if (!db || !currentUser.value || isCreatingChat.value) return;
  const title = draft.title.trim();
  const selectedIds = [...new Set(draft.participantIds)]
    .filter(id => id !== currentUser.value?.id && users.value.some(user => user.id === id));
  if (!title || title.length > 60 || (draft.kind === "chat" && selectedIds.length === 0)) return;

  isCreatingChat.value = true;
  chatCreateError.value = "";

  try {
    const participantIds = [currentUser.value.id, ...selectedIds];
    const subtitle = draft.kind === "channel"
      ? `Читателей: ${selectedIds.length}`
      : `Участников: ${participantIds.length}`;
    const result = await db.execute(
      `INSERT INTO chats (title, subtitle, participant_ids, kind, owner_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [title, subtitle, JSON.stringify(participantIds), draft.kind, currentUser.value.id],
    );
    await loadChats();
    const createdChat = chats.value.find(chat => chat.id === result.lastInsertId);
    if (createdChat) await selectChat(createdChat);
    isChatCreatorOpen.value = false;
  } catch (error) {
    console.error(error);
    chatCreateError.value = draft.kind === "channel"
      ? "Не удалось создать канал. Попробуйте ещё раз."
      : "Не удалось создать чат. Попробуйте ещё раз.";
  } finally {
    isCreatingChat.value = false;
  }
}
const editingMessage = ref<Message | null>(null);
const isSavingEdit = ref(false);
function startEditing(message: Message) {
  if (!canPublish.value) return;
  if (savingCommentPostId.value !== null) return;
  if (isSavingEdit.value || message.author_id !== currentUser.value?.id || message.type !== "text") return;
  cancelComment();
  editingMessage.value = message;
}
function cancelEditing() { if (!isSavingEdit.value) editingMessage.value = null; }


function openProfile(){
  isProfileOpen.value = true;
}

function closeProfile(){
  isProfileOpen.value = false;
}

async function saveProfile( profile: ProfileUpdate, ){
  if (!db) return;
  if (!currentUser.value) return;

  isSavingProfile.value = true;
  try {

  await db.execute(
      `
      UPDATE users

      SET
          display_name = $1,
          status = $2,
          avatar_path = $3

      WHERE id = $4
      `,
      [
      profile.displayName,
      profile.status,
      profile.avatarPath,
      currentUser.value.id,
          ]
  );

  currentUser.value.display_name = profile.displayName;
  currentUser.value.status = profile.status;
  currentUser.value.avatar_path = profile.avatarPath;

  if(activeChat.value){
    await loadMessages(activeChat.value.id);
    await markChatRead(activeChat.value.id);
    await loadChats();;
  }


  closeProfile();
  } catch (error) {
    console.error(error);
    status.value = "Не удалось сохранить профиль";
  } finally {
    isSavingProfile.value = false;
  }
}
import {computed, onMounted, ref} from "vue";

import Database from "@tauri-apps/plugin-sql";

import AppHeader from "./components/AppHeader.vue";

import MessageList from "./components/MessageList.vue";

import MessageComposer from "./components/MessageComposer.vue";

import ChatSidebar from "./components/ChatSidebar.vue";

import type { Chat } from "./types/chats";

import type { Message } from "./types/message.ts";

const users = ref<User[]>([]);

const currentUser = ref<User | null>(null);

const messages = ref<Message[]>([]);
const comments = ref<PostComment[]>([]);
const savingCommentPostId = ref<number | null>(null);
const commentError = ref("");
const commentingPost = ref<Message | null>(null);

function startComment(message: Message){
  if (activeChat.value?.kind !== "channel" || isSavingEdit.value
      || savingCommentPostId.value !== null
      || !messages.value.some(post => post.id === message.id)) return;

  cancelEditing();
  commentingPost.value = message;
  commentError.value = "";
}

function cancelComment(){
  if (savingCommentPostId.value !== null) return;
  commentingPost.value = null;
  commentError.value = "";
}

async function submitComposer(body: string){
  if (commentingPost.value){
    await sendComment(commentingPost.value.id, body);
  } else {
    await sendMessage(body);
  }
}

async function sendComment(messageId: number, body: string){
  if (!db || !currentUser.value || activeChat.value?.kind !== "channel"
      || savingCommentPostId.value !== null) return;
  const cleanBody = body.trim();
  if (!cleanBody || cleanBody.length > 1000
      || !messages.value.some(message => message.id === messageId)) return;

  const chatId = activeChat.value.id;
  savingCommentPostId.value = messageId;
  commentError.value = "";

  try {
    await db.execute(
      `INSERT INTO post_comments (message_id, author_id, body) VALUES ($1, $2, $3)`,
      [messageId, currentUser.value.id, cleanBody],
    );
    await loadComments(chatId);
  } catch (error) {
    console.error(error);
    commentError.value = "Не удалось отправить комментарий. Попробуйте ещё раз.";
  } finally {
    savingCommentPostId.value = null;
  }
}

async function loadComments(chatId: number){
  if (!db) return;
  comments.value = await db.select<PostComment[]>(
    `SELECT post_comments.id, post_comments.message_id, post_comments.author_id,
            users.display_name AS author_name, users.avatar_path AS author_avatar,
            post_comments.body, post_comments.created_at
     FROM post_comments
     JOIN users ON users.id = post_comments.author_id
     JOIN messages ON messages.id = post_comments.message_id
     WHERE messages.chat_id = $1
     ORDER BY post_comments.id ASC`,
    [chatId],
  );
}

const chats = ref<Chat[]>([]);

const activeChat = ref<Chat | null>(null);

const canPublish = computed(() => {
  if (!activeChat.value || !currentUser.value){
    return false;
  }

  return activeChat.value.kind !== "channel"
    || activeChat.value.owner_id === currentUser.value.id;
});

const activeChatId = ref(1);
const status = ref("Подключение...")
let db: Database | null = null;

async function createReadsTable() {
  if (!db) return;
  await db.execute(`CREATE TABLE IF NOT EXISTS chat_reads (
    user_id INTEGER NOT NULL, chat_id INTEGER NOT NULL,
    last_read_message_id INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, chat_id)
  )`);
}
async function loadChats(){
  if (!db || !currentUser.value) return;
  chats.value = await db.select<Chat[]>(
    `SELECT chats.id, chats.title, chats.subtitle, chats.kind, chats.owner_id,
      (SELECT COUNT(*) FROM messages
       WHERE messages.chat_id = chats.id AND messages.author_id != $1
       AND messages.id > COALESCE((SELECT last_read_message_id FROM chat_reads
         WHERE user_id = $1 AND chat_id = chats.id), 0)) AS unread_count
     FROM chats
     WHERE chats.participant_ids IS NULL
       OR EXISTS (SELECT 1 FROM json_each(chats.participant_ids) WHERE value = $1)
     ORDER BY chats.id ASC`, [currentUser.value.id],
  );
}
async function markChatRead(chatId: number) {
  if (!db || !currentUser.value) return;
  const lastId = messages.value.reduce((id, message) => message.chat_id === chatId ? Math.max(id, message.id) : id, 0);
  await db.execute(
    `INSERT INTO chat_reads (user_id, chat_id, last_read_message_id) VALUES ($1, $2, $3)
     ON CONFLICT (user_id, chat_id) DO UPDATE SET
       last_read_message_id = MAX(chat_reads.last_read_message_id, excluded.last_read_message_id)`,
    [currentUser.value.id, chatId, lastId],
  );
}

async function selectChat(chat: Chat){
  if (isLoadingChat.value || isSending.value || isSavingEdit.value || savingCommentPostId.value !== null) return;
  isLoadingChat.value = true;
  try {
  cancelEditing();
  cancelComment();
  comments.value = [];
  commentError.value = "";
  activeChat.value = chat;

  activeChatId.value = chat.id;

  await loadMessages(chat.id);
  await markChatRead(chat.id);
  await loadChats();
  } finally {
    isLoadingChat.value = false;
  }
}
async function loadMessages(chatId: number){
  if (!db) return;
  messages.value = await db.select<Message[]>(
    `SELECT
       messages.id,
       messages.chat_id,
       messages.author_id,
       users.display_name AS author_name,
       users.avatar_path AS author_avatar,
       messages.type,
       messages.body,
       messages.attachment,
       messages.created_at,
       messages.edited_at
    FROM messages
    INNER JOIN users
        ON users.id = messages.author_id
    WHERE messages.chat_id = $1
    ORDER BY messages.id ASC
    `,
      [chatId],
  );
  if (activeChat.value?.kind === "channel"){
    await loadComments(chatId);
  } else {
    comments.value = [];
  }
}

async function loadUsers(){
  if(!db) return;

  users.value =
      await db.select<User[]>(
          `
          SELECT
          id,
          username,
          display_name,
          avatar_path,
          status,
          created_at
          FROM users
          ORDER BY id ASC
          `,
      );
}
async function sendMessage(body: string){
  if (isSending.value || isLoadingChat.value) return;
  if (commentingPost.value) return;
  if (!canPublish.value) return;
  if (!db) return;

  if (!activeChat.value) return;

  if(!currentUser.value) return;

  isSending.value = true;
  try {
    await db.execute(
      `
         INSERT INTO messages (
              chat_id,
              author_id,
              type,
              body,
              attachment
         )
         VALUES ($1, $2, $3, $4, $5)
      `,
        [
            activeChat.value.id,
            currentUser.value.id,
            "text",
            body,
            null,
        ],
    );
    await loadMessages(activeChat.value.id);
    await markChatRead(activeChat.value.id);
    await loadChats();
  } catch (error) {
    console.error(error);
    status.value = "Не удалось отправить сообщение";
  } finally {
    isSending.value = false;
  }
}

async function sendImage(path:string){
  if (isSending.value || isLoadingChat.value) return;
  if (commentingPost.value) return;
  if (!canPublish.value) return;
  if(!db)
    return;

  if (!activeChat.value)
    return;

  if(!currentUser.value) return;

  isSending.value = true;
  try {
    await db.execute(
        `
          INSERT INTO messages
          (
             chat_id,
             author_id,
             type,
             body,
             attachment
          )

          VALUES
          (
              $1,
              $2,
              $3,
              $4,
              $5
          )
        `,
        [
            activeChat.value.id,
            currentUser.value.id,
            "image",
            null,
            path,
        ]
    );

    await loadMessages(activeChat.value.id);
    await markChatRead(activeChat.value.id);
    await loadChats();
  } catch (error) {
    console.error(error);
    status.value = "Не удалось отправить изображение";
  } finally {
    isSending.value = false;
  }
}

async function deleteMessage(messageId: number) {
  if (savingCommentPostId.value !== null) return;
  if (!db || !activeChat.value || !currentUser.value || !canPublish.value || isSavingEdit.value) return;
  const chatId = activeChat.value.id;
  try {
    await db.execute(
      `DELETE FROM messages WHERE id = $1 AND chat_id = $2
       AND EXISTS (SELECT 1 FROM chats WHERE id = $2 AND (kind = 'chat' OR owner_id = $3))`,
      [messageId, chatId, currentUser.value.id],
    );
    if (commentingPost.value?.id === messageId) cancelComment();
    if (editingMessage.value?.id === messageId) cancelEditing();
    if (activeChat.value?.id === chatId) await loadMessages(chatId);
    await loadChats();
  } catch (error) {
    console.error(error);
    status.value = "Не удалось удалить сообщение";
  }
}
async function editMessage(messageId: number, body: string) {
  if (!canPublish.value) return;
  if (!db || !activeChat.value || !currentUser.value || isSavingEdit.value || editingMessage.value?.id !== messageId) return;
  const cleanBody = body.trim();
  if (!cleanBody) return;
  const chatId = activeChat.value.id;
  isSavingEdit.value = true;
  try {
    await db.execute(
      `UPDATE messages SET body = $1, edited_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND author_id = $3 AND chat_id = $4 AND type = 'text'
       AND EXISTS (SELECT 1 FROM chats WHERE id = $4 AND (kind = 'chat' OR owner_id = $3))`,
      [cleanBody, messageId, currentUser.value.id, chatId],
    );
    await loadMessages(chatId);
    editingMessage.value = null;
  } catch (error) {
    console.error(error);
    status.value = "Не удалось изменить сообщение";
  } finally { isSavingEdit.value = false; }
}

onMounted(async()=>{
  try{
    db = await Database.load("sqlite:messenger.db");

    await createReadsTable();
    authReady.value = true;
  }catch (error){
    console.error(error);

    status.value = `Ошибка загрузки: ${String(error)}`;
    authError.value = "Не удалось открыть базу данных. Перезапустите приложение.";
  }
});

</script>

<template>
  <main class="app">
    <AuthScreen
      v-if="!currentUser"
      :busy="authBusy"
      :ready="authReady"
      :error="authError"
      @submit="submitAuth"
      @clear-error="authError = ''"
    />
    <AppHeader
        v-if="currentUser"
        :status="status"
        :current-user="currentUser"
        :busy="sessionBusy"
        @profile="openProfile"
        @logout="logout"
    />
    <div
        v-if="currentUser"
        class="workspace">
      <ChatSidebar
          :chats="chats"
          :active-chat-id="activeChatId"
          @select="selectChat"
          @create="openChatCreator"
          @create-channel="openChannelCreator"
      />
      <section class="chat">
        <template v-if="activeChat">
          <div class="chat-info">
            <h2>{{ activeChat.title }}</h2>
            <p>{{ activeChat.kind === 'channel' ? 'Канал · ' : '' }}{{ activeChat.subtitle }}</p>
          </div>
          <MessageList
              :key="`${activeChat.id}-${currentUser.id}`"
              :messages="messages"
              :current-user-id="currentUser.id"
              :read-only="!canPublish"
              :is-channel="activeChat.kind === 'channel'"
              :comments="comments"
              :commenting-post-id="commentingPost?.id ?? null"
              @edit="startEditing"
              @delete="deleteMessage"
              @comment="startComment"
          />
          <MessageComposer
              v-if="canPublish || commentingPost"
              :key="`${activeChat.id}-${currentUser.id}-${commentingPost?.id ?? 'post'}`"
              :editing-message="editingMessage"
              :comment-message="commentingPost"
              :comment-error="commentError"
              :saving="isSavingEdit || isSending || isLoadingChat || savingCommentPostId !== null"
              @edit="editMessage"
              @cancel-edit="cancelEditing"
              @cancel-comment="cancelComment"
              @send="submitComposer"
              @sendImage="sendImage"
              @send-sticker="sendImage"
          />
          <p v-else class="channel-read-only" role="status">
            Чтобы написать комментарий, нажмите ПКМ по посту и выберите «Комментировать».
          </p>
        </template>
      </section>
    </div>
    <ChatCreator
      v-if="isChatCreatorOpen && currentUser"
      :key="creationKind"
      :kind="creationKind"
      :users="users"
      :current-user-id="currentUser.id"
      :saving="isCreatingChat"
      :error="chatCreateError"
      @create="createChat"
      @close="closeChatCreator"
    />
    <ProfilerEditor
    v-if="isProfileOpen && currentUser"
    :key="currentUser.id"
    :user="currentUser"
    @save="saveProfile"
    @close="closeProfile"
    />
  </main>
</template>

<style scoped>
.channel-read-only{
  margin: 0;
  padding: 15px 20px;
  border-top: 1px solid var(--bubble);
  background: var(--surface);
  color: var(--muted);
  font-size: 13px;
  text-align: center;
}

.startup-status{padding:24px;overflow-wrap:anywhere}

:global(*){
  box-sizing: border-box;
}

:global(html){
  background: var(--bg);
  color-scheme: inherit;
}

:global(body){
  margin: 0;

  font-family:
  Inter,
  system-ui,
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  sans-serif;

  color: var(--text);

  background: var(--bg);
}

.workspace{
  flex: 1;
  min-height: 0;
  display: flex;
  overflow: hidden;
}

.app{
  height: 100vh;
  display: flex;
  flex-direction: column;
  
  overflow: hidden;
}

.chat{
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden; 
}

.chat-info{
  padding: 20px 24px;
  border-bottom: 1px solid var(--bubble);
}

.chat-info h2{
  margin: 0;
  font-size: 16px;
}

.chat-info p{
  margin: 5px 0 0;
  color: var(--muted);
  font-size: 13px;
}

</style>










