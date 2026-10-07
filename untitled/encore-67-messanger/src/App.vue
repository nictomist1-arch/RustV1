<script setup lang="ts">

import type { User } from "./types/user";

import ProfilerEditor from "./components/ProfilerEditor.vue";

import type { ProfileUpdate } from "./types/user";

const isProfileOpen = ref(false);
const editingMessage = ref<Message | null>(null);
const isSavingEdit = ref(false);
function startEditing(message: Message) {
  if (isSavingEdit.value || message.author_id !== currentUser.value?.id || message.type !== "text") return;
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

  await db.execute(
      `
      UPDATE users

      SET
          display_name = $1,
          status = $2

      WHERE id = $3
      `,
      [
      profile.displayName,
      profile.status,
      currentUser.value.id,
          ]
  );

  currentUser.value.display_name = profile.displayName;
  currentUser.value.status = profile.status;

  if(activeChat.value){
    await loadMessages(activeChat.value.id);
    await markChatRead(activeChat.value.id);
    await loadChats();;
  }


  closeProfile();
}
import {onMounted, ref} from "vue";

import Database from "@tauri-apps/plugin-sql";

import AppHeader from "./components/AppHeader.vue";

import MessageList from "./components/MessageList.vue";

import MessageComposer from "./components/MessageComposer.vue";

import ChatSidebar from "./components/ChatSidebar.vue";

import type { Chat } from "./types/chats";

import type { Message } from "./types/message.ts";

const users = ref<User[]>([]);

const currentUser = ref<User | null>(null);

async function selectUser(user: User){
  if (isSavingEdit.value) return;
  cancelEditing();
  currentUser.value = user;
  if (activeChat.value) await markChatRead(activeChat.value.id);
  await loadChats();
}
const messages = ref<Message[]>([]);

const chats = ref<Chat[]>([]);

const activeChat = ref<Chat | null>(null);

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
    `SELECT chats.id, chats.title, chats.subtitle,
      (SELECT COUNT(*) FROM messages
       WHERE messages.chat_id = chats.id AND messages.author_id != $1
       AND messages.id > COALESCE((SELECT last_read_message_id FROM chat_reads
         WHERE user_id = $1 AND chat_id = chats.id), 0)) AS unread_count
     FROM chats ORDER BY chats.id ASC`, [currentUser.value.id],
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
  if (isSavingEdit.value) return;
  cancelEditing();
  activeChat.value = chat;

  activeChatId.value = chat.id;

  await loadMessages(chat.id);
  await markChatRead(chat.id);
  await loadChats();
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
  if (
      users.value.length > 0 && currentUser.value === null){
    currentUser.value = users.value[0];
  }
}
async function sendMessage(body: string){
  if (!db) return;

  if (!activeChat.value) return;

  if(!currentUser.value) return;

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
  }
}

async function sendImage(path:string){
  if(!db)
    return;

  if (!activeChat.value)
    return;

  if(!currentUser.value) return;

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
  }
}

async function deleteMessage(messageId: number) {
  if (!db || !activeChat.value || isSavingEdit.value) return;
  const chatId = activeChat.value.id;
  try {
    await db.execute("DELETE FROM messages WHERE id = $1 AND chat_id = $2", [messageId, chatId]);
    if (editingMessage.value?.id === messageId) cancelEditing();
    if (activeChat.value?.id === chatId) await loadMessages(chatId);
    await loadChats();
  } catch (error) {
    console.error(error);
    status.value = "Не удалось удалить сообщение";
  }
}
async function editMessage(messageId: number, body: string) {
  if (!db || !activeChat.value || !currentUser.value || isSavingEdit.value || editingMessage.value?.id !== messageId) return;
  const cleanBody = body.trim();
  if (!cleanBody) return;
  const chatId = activeChat.value.id;
  isSavingEdit.value = true;
  try {
    await db.execute(
      `UPDATE messages SET body = $1, edited_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND author_id = $3 AND chat_id = $4 AND type = 'text'`,
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

    await loadUsers();
    if (!currentUser.value) throw new Error("В базе нет пользователей");
    await createReadsTable();


    await loadChats();
    if (chats.value[0]) await selectChat(chats.value[0]);
    status.value = "История сохраняется локально";
  }catch (error){
    console.error(error);

    status.value = `Ошибка загрузки: ${String(error)}`;
  }
});

</script>

<template>
  <main class="app">
    <p v-if="!currentUser" role="status" class="startup-status">{{ status }}</p>
    <AppHeader
        v-if="currentUser"
        :status="status"
        :users="users"
        :current-user="currentUser"
        @select="selectUser"
        @profile="openProfile"
    />
    <div
        v-if="currentUser"
        class="workspace">
      <ChatSidebar
          :chats="chats"
          :active-chat-id="activeChatId"
          @select="selectChat"
      />
      <section class="chat">
        <template v-if="activeChat">
          <div class="chat-info">
            <h2>{{ activeChat.title }}</h2>
            <p>{{ activeChat.subtitle }}</p>
          </div>
          <MessageList
              :key="activeChat.id"
              :messages="messages"
              :current-user-id="currentUser.id"
              @edit="startEditing"
              @delete="deleteMessage"
          />
          <MessageComposer
              :key="`${activeChat.id}-${currentUser.id}`"
              :editing-message="editingMessage"
              :saving="isSavingEdit"
              @edit="editMessage"
              @cancel-edit="cancelEditing"
              @send="sendMessage"
              @sendImage="sendImage"
              @send-sticker="sendImage"
          />
        </template>
      </section>
    </div>
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










