// backend/services/pushNotifications.js
const { Expo } = require('expo-server-sdk');
const { sql, getPool } = require('../db');

let expo = new Expo();

/**
 * Get push tokens for users
 */
async function getUserPushTokens(userIds) {
  try {
    const pool = await getPool();
    
    const result = await pool
      .request()
      .query(`
        SELECT UserId, PushToken, DevicePlatform
        FROM dbo.UserPushTokens
        WHERE UserId IN (${userIds.map(id => `'${id}'`).join(',')})
          AND IsActive = 1
      `);
    
    return result.recordset;
  } catch (error) {
    console.error('Error getting push tokens:', error);
    return [];
  }
}

/**
 * Save push token for user
 */
async function savePushToken(userId, token, platform) {
  try {
    const pool = await getPool();
    
    // Check if token already exists
    const existing = await pool
      .request()
      .input('Token', sql.NVarChar(255), token)
      .input('UserId', sql.UniqueIdentifier, userId)
      .query(`
        SELECT Id FROM dbo.UserPushTokens 
        WHERE PushToken = @Token AND UserId = @UserId
      `);
    
    if (existing.recordset.length > 0) {
      // Update existing token
      await pool
        .request()
        .input('Token', sql.NVarChar(255), token)
        .input('UserId', sql.UniqueIdentifier, userId)
        .input('Platform', sql.NVarChar(50), platform)
        .query(`
          UPDATE dbo.UserPushTokens 
          SET LastSeenAt = GETUTCDATE(), 
              DevicePlatform = @Platform,
              IsActive = 1
          WHERE PushToken = @Token AND UserId = @UserId
        `);
    } else {
      // Insert new token
      await pool
        .request()
        .input('UserId', sql.UniqueIdentifier, userId)
        .input('PushToken', sql.NVarChar(255), token)
        .input('DevicePlatform', sql.NVarChar(50), platform)
        .query(`
          INSERT INTO dbo.UserPushTokens (UserId, PushToken, DevicePlatform, CreatedAt, LastSeenAt, IsActive)
          VALUES (@UserId, @PushToken, @DevicePlatform, GETUTCDATE(), GETUTCDATE(), 1)
        `);
    }
    
    return true;
  } catch (error) {
    console.error('Error saving push token:', error);
    return false;
  }
}

/**
 * Send push notifications to multiple users
 */
async function sendPushToUsers(userIds, notification) {
  try {
    const tokens = await getUserPushTokens(userIds);
    
    if (tokens.length === 0) {
      console.log('No push tokens found for users:', userIds);
      return false;
    }
    
    const messages = [];
    
    for (const tokenInfo of tokens) {
      const { PushToken: token } = tokenInfo;
      
      if (!Expo.isExpoPushToken(token)) {
        console.log(`Invalid Expo push token: ${token}`);
        continue;
      }
      
      messages.push({
        to: token,
        sound: notification.sound || 'default',
        title: notification.title,
        body: notification.body,
        data: notification.data || {},
        priority: notification.priority || 'high',
        badge: notification.badge || 1,
      });
    }
    
    if (messages.length === 0) {
      return false;
    }
    
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];
    
    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('Error sending chunk:', error);
      }
    }
    
    // Handle invalid tokens
    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i];
      if (ticket.status === 'error') {
        const message = messages[i];
        if (ticket.details?.error === 'DeviceNotRegistered') {
          await deactivatePushToken(message.to);
        }
      }
    }
    
    console.log(`Sent ${messages.length} push notifications`);
    return true;
  } catch (error) {
    console.error('Error sending push notifications:', error);
    return false;
  }
}

/**
 * Send single push notification
 */
async function sendPushToUser(userId, notification) {
  return sendPushToUsers([userId], notification);
}

/**
 * Deactivate invalid push token
 */
async function deactivatePushToken(token) {
  try {
    const pool = await getPool();
    await pool
      .request()
      .input('Token', sql.NVarChar(255), token)
      .query(`
        UPDATE dbo.UserPushTokens 
        SET IsActive = 0, DeactivatedAt = GETUTCDATE()
        WHERE PushToken = @Token
      `);
  } catch (error) {
    console.error('Error deactivating token:', error);
  }
}

module.exports = {
  sendPushToUsers,
  sendPushToUser,
  savePushToken,
  getUserPushTokens,
};