package repository

import (
	"database/sql"
	"fmt"
	"survey-right/internal/models"
)

type ResponseRepo struct {
	db *sql.DB
}

func NewResponseRepo(db *sql.DB) *ResponseRepo {
	return &ResponseRepo{db: db}
}

func (r *ResponseRepo) Create(req *models.CreateResponseRequest) (*models.Response, error) {
	resp := &models.Response{}
	err := r.db.QueryRow(
		`INSERT INTO responses (refid, name, secname, data)
		 VALUES ($1, $2, $3, $4)
		 RETURNING id, refid, name, secname, data, created_at, updated_at`,
		req.RefID, req.Name, req.SecName, req.Data,
	).Scan(&resp.ID, &resp.RefID, &resp.Name, &resp.SecName, &resp.Data, &resp.CreatedAt, &resp.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("create response: %w", err)
	}
	return resp, nil
}

func (r *ResponseRepo) BulkCreate(reqs []models.CreateResponseRequest) ([]models.Response, error) {
	tx, err := r.db.Begin()
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare(
		`INSERT INTO responses (refid, name, secname, data)
		 VALUES ($1, $2, $3, $4)
		 RETURNING id, refid, name, secname, data, created_at, updated_at`,
	)
	if err != nil {
		return nil, fmt.Errorf("prepare stmt: %w", err)
	}
	defer stmt.Close()

	var responses []models.Response
	for _, req := range reqs {
		resp := models.Response{}
		err := stmt.QueryRow(req.RefID, req.Name, req.SecName, req.Data).
			Scan(&resp.ID, &resp.RefID, &resp.Name, &resp.SecName, &resp.Data, &resp.CreatedAt, &resp.UpdatedAt)
		if err != nil {
			return nil, fmt.Errorf("insert response: %w", err)
		}
		responses = append(responses, resp)
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("commit tx: %w", err)
	}
	return responses, nil
}

func (r *ResponseRepo) GetByRefID(refid string) ([]models.Response, error) {
	rows, err := r.db.Query(
		`SELECT id, refid, name, secname, data, created_at, updated_at
		 FROM responses WHERE refid = $1 ORDER BY created_at DESC`,
		refid,
	)
	if err != nil {
		return nil, fmt.Errorf("list responses: %w", err)
	}
	defer rows.Close()

	var responses []models.Response
	for rows.Next() {
		var resp models.Response
		if err := rows.Scan(&resp.ID, &resp.RefID, &resp.Name, &resp.SecName, &resp.Data, &resp.CreatedAt, &resp.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan response: %w", err)
		}
		responses = append(responses, resp)
	}
	return responses, rows.Err()
}

func (r *ResponseRepo) CountByRefID(refid string) (int, error) {
	var count int
	err := r.db.QueryRow(`SELECT COUNT(*) FROM responses WHERE refid = $1`, refid).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("count responses: %w", err)
	}
	return count, nil
}
