package config

import (
        "net/url"
        "os"
        "strconv"
        "strings"
)

// parseDatabaseURL parses a postgres:// or postgresql:// URL and injects
// the individual DB_* env vars so the rest of Load() picks them up.
// It only overwrites a var if DATABASE_URL is set and the individual var
// is empty or still points to the Replit-internal host ("helium").
func parseDatabaseURL() {
        raw := os.Getenv("DATABASE_URL")
        if raw == "" {
                return
        }
        u, err := url.Parse(raw)
        if err != nil || u.Host == "" {
                return
        }

        host := u.Hostname()
        port := u.Port()
        if port == "" {
                port = "5432"
        }
        user := u.User.Username()
        password, _ := u.User.Password()
        dbName := strings.TrimPrefix(u.Path, "/")

        // Only override if the individual var is missing or still the Replit local DB
        override := func(key, val string) {
                cur := os.Getenv(key)
                if cur == "" || cur == "helium" || cur == "localhost" || cur == "127.0.0.1" {
                        os.Setenv(key, val)
                }
        }
        override("DB_HOST", host)
        override("DB_PORT", port)
        if user != "" {
                override("DB_USER", user)
        }
        if password != "" {
                override("DB_PASSWORD", password)
        }
        if dbName != "" {
                override("DB_NAME", dbName)
        }
}

type Config struct {
        // Server
        Port        string
        Environment string

        // Database (Supabase PostgreSQL)
        DBHost     string
        DBPort     int
        DBUser     string
        DBPassword string
        DBName     string
        DBSSLMode  string
        DBMaxConns int

        // JWT
        JWTSecret string

        // Settlement Contract
        SettlementContractBSC  string
        SettlementContractBase string

        // Executor
        ExecutorEnabled       bool
        ExecutorRPCURL        string
        ExecutorRPCURLBase    string
        ExecutorPrivateKey    string
        ExecutorIntervalMs    int
        ChainID               int64
        ChainIDBase           int64
        SettlementAddress     string
        SettlementAddressBase string

        // API Keys
        InfuraURL          string
        AlchemyURL         string
        EtherscanKey       string
        SolanaRPCURL       string
        SolanaCustodyAddr  string
        SolanaCustodyPrivateKey string
}

// sanitizeHost strips protocol prefixes and trailing slashes from a hostname.
// Handles values like "http://host.example.com/" → "host.example.com"
func sanitizeHost(raw string) string {
        raw = strings.TrimSpace(raw)
        for _, prefix := range []string{"https://", "http://"} {
                raw = strings.TrimPrefix(raw, prefix)
        }
        return strings.TrimRight(raw, "/")
}

func Load() *Config {
        // Parse DATABASE_URL first so individual DB_* vars get populated from it
        parseDatabaseURL()

        return &Config{
                Port:                   getEnv("PORT", "8080"),
                Environment:            getEnv("ENVIRONMENT", "development"),
                DBHost:                 sanitizeHost(getEnvFallback3("DB_HOST", "SUPABASE_DB_HOST", "PGHOST", "localhost")),
                DBPort:                 getEnvAsInt(getEnvFallbackKey("DB_PORT", "PGPORT"), 5432),
                DBUser:                 getEnvFallback("DB_USER", "PGUSER", "postgres"),
                DBPassword:             getEnvFallback3("DB_PASSWORD", "SUPABASE_DB_PASSWORD", "PGPASSWORD", ""),
                DBName:                 getEnvFallback("DB_NAME", "PGDATABASE", "postgres"),
                DBSSLMode:              getEnv("DB_SSL_MODE", "require"),
                DBMaxConns:             getEnvAsInt("DB_MAX_CONNS", 25),
                JWTSecret:              getEnv("JWT_SECRET", "your-secret-key-change-in-production"),
                SettlementContractBSC:  getEnv("SETTLEMENT_CONTRACT_BSC", "0x4896ebe3EE1436a58c690A8021301A6bFD6BD4E7"),
                SettlementContractBase: getEnv("SETTLEMENT_CONTRACT_BASE", "0x723da0ef5eea8370015465e9Cf2513D7e48e1b61"),
                ExecutorEnabled:        getEnvAsBool("EXECUTOR_ENABLED", false),
                ExecutorRPCURL:         getEnv("EXECUTOR_RPC_URL", "https://bsc-dataseed-public.bnbchain.org/"),
                ExecutorRPCURLBase:     getEnv("EXECUTOR_RPC_URL_BASE", ""),
                ExecutorPrivateKey:     getEnv("EXECUTOR_PRIVATE_KEY", ""),
                ExecutorIntervalMs:     getEnvAsInt("EXECUTOR_INTERVAL_MS", 5000),
                ChainID:                getEnvAsInt64("CHAIN_ID", 56),
                ChainIDBase:            getEnvAsInt64("CHAIN_ID_BASE", 8453),
                SettlementAddress:      getEnv("SETTLEMENT_ADDRESS", "0x4896ebe3EE1436a58c690A8021301A6bFD6BD4E7"),
                SettlementAddressBase:  getEnv("SETTLEMENT_ADDRESS_BASE", "0x723da0ef5eea8370015465e9Cf2513D7e48e1b61"),
                InfuraURL:              getEnv("INFURA_URL", ""),
                AlchemyURL:             getEnv("ALCHEMY_URL", ""),
                EtherscanKey:           getEnv("ETHERSCAN_KEY", ""),
                SolanaRPCURL:           getEnv("SOLANA_RPC_URL", ""),
                SolanaCustodyAddr:      getEnv("SOLANA_CUSTODY_ADDRESS", ""),
                SolanaCustodyPrivateKey: getEnv("SOLANA_CUSTODY_PRIVATE_KEY", ""),
        }
}

func getEnvAsBool(key string, defaultValue bool) bool {
        valueStr := getEnv(key, "")
        if valueStr == "" {
                return defaultValue
        }
        return valueStr == "true" || valueStr == "1"
}

func getEnvAsInt64(key string, defaultValue int64) int64 {
        valueStr := getEnv(key, "")
        if value, err := strconv.ParseInt(valueStr, 10, 64); err == nil {
                return value
        }
        return defaultValue
}

func getEnv(key, defaultValue string) string {
        if value, exists := os.LookupEnv(key); exists {
                return value
        }
        return defaultValue
}

// getEnvFallback returns the value of primaryKey, falling back to fallbackKey, then defaultValue.
func getEnvFallback(primaryKey, fallbackKey, defaultValue string) string {
        if value, exists := os.LookupEnv(primaryKey); exists && value != "" {
                return value
        }
        if value, exists := os.LookupEnv(fallbackKey); exists && value != "" {
                return value
        }
        return defaultValue
}

// getEnvFallback3 checks three keys in order, returning the first non-empty value.
func getEnvFallback3(key1, key2, key3, defaultValue string) string {
        for _, key := range []string{key1, key2, key3} {
                if value, exists := os.LookupEnv(key); exists && value != "" {
                        return value
                }
        }
        return defaultValue
}

// getEnvFallbackKey returns the first env key that has a non-empty value.
func getEnvFallbackKey(primaryKey, fallbackKey string) string {
        if value, exists := os.LookupEnv(primaryKey); exists && value != "" {
                _ = value
                return primaryKey
        }
        return fallbackKey
}

func getEnvAsInt(key string, defaultValue int) int {
        valueStr := getEnv(key, "")
        if value, err := strconv.Atoi(valueStr); err == nil {
                return value
        }
        return defaultValue
}
