package repository

import (
	"context"

	"github.com/cexdex/backend/internal/db"
	"github.com/cexdex/backend/internal/models"
)

type FillRepository struct {
	db    *db.DB
	redis *db.RedisClient
}

func NewFillRepository(db *db.DB, redis *db.RedisClient) *FillRepository {
	return &FillRepository{db: db, redis: redis}
}

func (r *FillRepository) Create(ctx context.Context, fill *models.Fill) error {
	return r.db.WithContext(ctx).Create(fill).Error
}

func (r *FillRepository) GetByID(ctx context.Context, id uint) (*models.Fill, error) {
	var fill models.Fill
	if err := r.db.WithContext(ctx).First(&fill, id).Error; err != nil {
		return nil, err
	}
	return &fill, nil
}

func (r *FillRepository) GetByUserID(ctx context.Context, userID uint, limit, offset int) ([]models.Fill, error) {
	var fills []models.Fill
	err := r.db.WithContext(ctx).
		Where("(maker = (SELECT address FROM users WHERE id = ?) OR taker = (SELECT address FROM users WHERE id = ?)) AND (status = ? OR status = ?)", userID, userID, "settled", "").
		Order("created_at desc").
		Limit(limit).
		Offset(offset).
		Find(&fills).Error
	return fills, err
}

func (r *FillRepository) GetByPair(ctx context.Context, pairID string, limit int) ([]models.Fill, error) {
	var fills []models.Fill
	err := r.db.WithContext(ctx).
		Where("pair_id = ?", pairID).
		Order("created_at desc").
		Limit(limit).
		Find(&fills).Error
	return fills, err
}

func (r *FillRepository) GetByOrderID(ctx context.Context, orderID uint) ([]models.Fill, error) {
	var fills []models.Fill
	err := r.db.WithContext(ctx).
		Where("maker_order_id = ? OR taker_order_id = ?", orderID, orderID).
		Order("created_at desc").
		Find(&fills).Error
	return fills, err
}

func (r *FillRepository) GetByTxHash(ctx context.Context, txHash string) (*models.Fill, error) {
	var fill models.Fill
	err := r.db.WithContext(ctx).
		Where("tx_hash = ? OR tx_hash_buy = ? OR tx_hash_sell = ?", txHash, txHash, txHash).
		First(&fill).Error
	return &fill, err
}

func (r *FillRepository) GetPendingSettlements(ctx context.Context, limit int) ([]models.Fill, error) {
	var fills []models.Fill
	err := r.db.WithContext(ctx).
		Where("status = ?", "pending").
		Order("created_at asc").
		Limit(limit).
		Find(&fills).Error
	return fills, err
}

func (r *FillRepository) Update(ctx context.Context, fill *models.Fill) error {
	return r.db.WithContext(ctx).Save(fill).Error
}

func (r *FillRepository) GetByMakerAddress(ctx context.Context, maker string, limit int) ([]models.Fill, error) {
	var fills []models.Fill
	err := r.db.WithContext(ctx).
		Where("(maker = ? OR taker = ?) AND (status = ? OR status = ?)", maker, maker, "settled", "").
		Order("created_at desc").
		Limit(limit).
		Find(&fills).Error
	return fills, err
}

func (r *FillRepository) MarkAsSettled(ctx context.Context, fillID uint, txHash, txHashBuy, txHashSell string, blockNumber uint64, gasUsed uint64) error {
	updates := map[string]interface{}{
		"tx_hash":      txHash,
		"block_number": blockNumber,
		"gas_used":     gasUsed,
		"status":       "settled",
	}
	if txHashBuy != "" {
		updates["tx_hash_buy"] = txHashBuy
	}
	if txHashSell != "" {
		updates["tx_hash_sell"] = txHashSell
	}
	return r.db.WithContext(ctx).
		Model(&models.Fill{}).
		Where("id = ?", fillID).
		Updates(updates).Error
}
