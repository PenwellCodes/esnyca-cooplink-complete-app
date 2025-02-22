import * as SQLite from "expo-sqlite";
const db = SQLite.openDatabase("chat.db");

export const initDatabase = () => {
  db.transaction((tx) => {
    // Table for chat profiles
    tx.executeSql(
      `CREATE TABLE IF NOT EXISTS chat_profiles (
         id TEXT PRIMARY KEY NOT NULL,
         userType TEXT,              -- "individual" or "cooperative"
         name TEXT,                  -- For individuals
         cooperativeName TEXT,       -- For cooperatives
         lastMessage TEXT,
         avatar TEXT,
         updatedAt INTEGER
       );`
    );

    // Table for chat messages
    tx.executeSql(
      `CREATE TABLE IF NOT EXISTS chat_messages (
         id TEXT PRIMARY KEY NOT NULL,
         chatProfileId TEXT,
         sender TEXT,
         message TEXT,
         timestamp INTEGER,
         FOREIGN KEY (chatProfileId) REFERENCES chat_profiles(id)
       );`
    );
  });
};

export const insertOrUpdateChatProfile = (profile) => {
  // profile: { id, userType, name, cooperativeName, lastMessage, avatar, updatedAt }
  db.transaction((tx) => {
    tx.executeSql(
      `INSERT OR REPLACE INTO chat_profiles (id, userType, name, cooperativeName, lastMessage, avatar, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        profile.id,
        profile.userType,
        profile.name || null,
        profile.cooperativeName || null,
        profile.lastMessage || "",
        profile.avatar || "",
        profile.updatedAt || Date.now(),
      ]
    );
  });
};

export const fetchChatProfiles = (currentUserType, callback) => {
  // If the current user is individual, show only cooperative profiles.
  let query = "";
  let params = [];
  if (currentUserType === "individual") {
    query = `SELECT * FROM chat_profiles WHERE userType = ? ORDER BY updatedAt DESC`;
    params = ["cooperative"];
  } else {
    // Cooperative user sees all chat profiles.
    query = `SELECT * FROM chat_profiles ORDER BY updatedAt DESC`;
  }
  db.transaction((tx) => {
    tx.executeSql(query, params, (_, { rows: { _array } }) => {
      callback(_array);
    });
  });
};

export const insertChatMessage = (message) => {
  // message: { id, chatProfileId, sender, message, timestamp }
  db.transaction((tx) => {
    tx.executeSql(
      `INSERT OR REPLACE INTO chat_messages (id, chatProfileId, sender, message, timestamp)
       VALUES (?, ?, ?, ?, ?)`,
      [
        message.id,
        message.chatProfileId,
        message.sender,
        message.message,
        message.timestamp || Date.now(),
      ]
    );
  });
};

export const fetchChatMessages = (chatProfileId, callback) => {
  db.transaction((tx) => {
    tx.executeSql(
      `SELECT * FROM chat_messages WHERE chatProfileId = ? ORDER BY timestamp ASC`,
      [chatProfileId],
      (_, { rows: { _array } }) => {
        callback(_array);
      }
    );
  });
};

// Example sync function (to be called when online)
// It should fetch the remote data and update the local database accordingly.
export const syncChatData = async () => {
  // 1. Fetch remote chat profiles and messages
  // 2. For each profile, call insertOrUpdateChatProfile(profile)
  // 3. For each message, call insertChatMessage(message)
  // This part depends on your API implementation.
};
