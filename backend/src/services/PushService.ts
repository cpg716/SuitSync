import prisma from '../../server/prismaClient';
import webpush from 'web-push';
import fs from 'fs';
import path from 'path';

const VAPID_KEYS_PATH = path.resolve(__dirname, '../../../vapid-keys.json');

function getOrCreateVapidKeys() {
  if (fs.existsSync(VAPID_KEYS_PATH)) {
    return JSON.parse(fs.readFileSync(VAPID_KEYS_PATH, 'utf-8'));
  }
  const keys = webpush.generateVAPIDKeys();
  fs.writeFileSync(VAPID_KEYS_PATH, JSON.stringify(keys));
  return keys;
}

const vapidKeys = getOrCreateVapidKeys();
webpush.setVapidDetails(
  'mailto:admin@suitsync.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

export function getVapidPublicKey() {
  return vapidKeys.publicKey;
}

export async function saveSubscription(subscription) {
  const { endpoint, keys } = subscription;
  return prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { keys },
    create: { endpoint, keys },
  });
}

export async function getAllSubscriptions() {
  return prisma.pushSubscription.findMany();
}

export async function sendNotification(subscription, payload) {
  return webpush.sendNotification(subscription, JSON.stringify(payload));
} 