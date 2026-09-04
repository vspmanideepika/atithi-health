import { createClient } from "redis";

const REDIS_HOST = process.env.REDIS_HOST || "127.0.0.1";
const REDIS_PORT = parseInt(process.env.REDIS_PORT || "6379", 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;

export const redisClient = createClient({
    socket: {
        host: REDIS_HOST,
        port: REDIS_PORT,
        reconnectStrategy: (retries) => {
            if (retries > 3) {
                console.log("[Redis] Max reconnection attempts reached. Operating in database pass-through mode.");
                return new Error("Redis max retries reached");
            }
            return Math.min(retries * 100, 1000);
        },
    },
    password: REDIS_PASSWORD,
});

let isRedisConnected = false;

redisClient.on("connect", () => {
    isRedisConnected = true;
    console.log("[Redis] Connected to Redis caching server successfully.");
});

redisClient.on("error", (err) => {
    isRedisConnected = false;
    // Silent fallback to direct database queries if Redis server is offline
});

export const connectRedis = async (): Promise<void> => {
    try {
        await redisClient.connect();
    } catch (error) {
        isRedisConnected = false;
        console.log("[Redis] Local Redis server offline. Operating in database pass-through mode.");
    }
};

export const getCache = async <T>(key: string): Promise<T | null> => {
    if (!isRedisConnected || !redisClient.isOpen) return null;
    try {
        const data = await redisClient.get(key);
        return data ? (JSON.parse(data) as T) : null;
    } catch (err) {
        console.error(`[Redis] Error reading cache key "${key}":`, err);
        return null;
    }
};

export const setCache = async (key: string, value: any, ttlSeconds: number = 60): Promise<void> => {
    if (!isRedisConnected || !redisClient.isOpen) return;
    try {
        await redisClient.set(key, JSON.stringify(value), {
            EX: ttlSeconds,
        });
    } catch (err) {
        console.error(`[Redis] Error setting cache key "${key}":`, err);
    }
};

export const clearCachePattern = async (pattern: string): Promise<void> => {
    if (!isRedisConnected || !redisClient.isOpen) return;
    try {
        const keys = await redisClient.keys(pattern);
        if (keys.length > 0) {
            await redisClient.del(keys);
            console.log(`[Redis] Cleared ${keys.length} cached items matching pattern "${pattern}".`);
        }
    } catch (err) {
        console.error(`[Redis] Error clearing cache pattern "${pattern}":`, err);
    }
};
