package repository

import (
	"context"
	"time"

	"github.com/cexdex/backend/internal/db"
	"github.com/cexdex/backend/internal/models"
)

type UserRepository struct {
	db    *db.DB
	redis *db.RedisClient
}

func NewUserRepository(db *db.DB, redis *db.RedisClient) *UserRepository {
	return &UserRepository{db: db, redis: redis}
}

func (r *UserRepository) Create(ctx context.Context, user *models.User) error {
	user.CreatedAt = time.Now()
	user.UpdatedAt = time.Now()
	return r.db.WithContext(ctx).Create(user).Error
}

func (r *UserRepository) GetByID(ctx context.Context, id uint) (*models.User, error) {
	var user models.User
	if err := r.db.WithContext(ctx).First(&user, id).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) GetByAddress(ctx context.Context, address string) (*models.User, error) {
	var user models.User
	// Case-insensitive address lookup
	err := r.db.WithContext(ctx).Where("LOWER(address) = LOWER(?)", address).First(&user).Error
	return &user, err
}

func (r *UserRepository) UpdateProfile(ctx context.Context, userID uint, email, username string) error {
	updates := map[string]interface{}{
		"updated_at": time.Now(),
	}
	if email != "" {
		updates["email"] = email
	}
	if username != "" {
		updates["username"] = username
	}
	return r.db.WithContext(ctx).Model(&models.User{}).Where("id = ?", userID).Updates(updates).Error
}

func (r *UserRepository) GetOrCreate(ctx context.Context, address string) (*models.User, error) {
	user, err := r.GetByAddress(ctx, address)
	if err == nil {
		return user, nil
	}

	// Create new user
	user = &models.User{
		Address:      address,
		ReferralCode: generateReferralCode(),
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	if err := r.Create(ctx, user); err != nil {
		return nil, err
	}

	return user, nil
}

func generateReferralCode() string {
	// Simple random code generation
	return "CEX" + randomString(8)
}

func randomString(n int) string {
	const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, n)
	for i := range b {
		b[i] = letters[time.Now().UnixNano()%int64(len(letters))]
	}
	return string(b)
}

// GetOrCreateGuestUser returns or creates a guest user for unauthenticated orders
func (r *UserRepository) GetOrCreateGuestUser(ctx context.Context) (*models.User, error) {
	// Try to find guest user by known address
	guestAddress := "0x0000000000000000000000000000000000000000"
	user, err := r.GetByAddress(ctx, guestAddress)
	if err == nil {
		return user, nil
	}

	// Create guest user
	user = &models.User{
		Address:      guestAddress,
		Username:     "guest",
		ReferralCode: generateReferralCode(),
		Network:      models.NetworkBSC,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	if err := r.Create(ctx, user); err != nil {
		return nil, err
	}

	return user, nil
}
