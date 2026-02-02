package repository

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"survey-right/internal/models"
)

type SurveyRepo struct {
	db *sql.DB
}

func NewSurveyRepo(db *sql.DB) *SurveyRepo {
	return &SurveyRepo{db: db}
}

func (r *SurveyRepo) Create(req *models.CreateSurveyRequest) (*models.Survey, error) {
	s := &models.Survey{}
	err := r.db.QueryRow(
		`INSERT INTO surveys (refid, name, secname, data)
		 VALUES ($1, $2, $3, $4)
		 RETURNING id, refid, name, secname, data, created_at, updated_at`,
		req.RefID, req.Name, req.SecName, req.Data,
	).Scan(&s.ID, &s.RefID, &s.Name, &s.SecName, &s.Data, &s.CreatedAt, &s.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("create survey: %w", err)
	}
	return s, nil
}

func (r *SurveyRepo) GetAll() ([]models.Survey, error) {
	rows, err := r.db.Query(
		`SELECT id, refid, name, secname, data, created_at, updated_at
		 FROM surveys ORDER BY created_at DESC`,
	)
	if err != nil {
		return nil, fmt.Errorf("list surveys: %w", err)
	}
	defer rows.Close()

	var surveys []models.Survey
	for rows.Next() {
		var s models.Survey
		if err := rows.Scan(&s.ID, &s.RefID, &s.Name, &s.SecName, &s.Data, &s.CreatedAt, &s.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan survey: %w", err)
		}
		surveys = append(surveys, s)
	}
	return surveys, rows.Err()
}

func (r *SurveyRepo) GetByRefID(refid string) (*models.Survey, error) {
	s := &models.Survey{}
	err := r.db.QueryRow(
		`SELECT id, refid, name, secname, data, created_at, updated_at
		 FROM surveys WHERE refid = $1`,
		refid,
	).Scan(&s.ID, &s.RefID, &s.Name, &s.SecName, &s.Data, &s.CreatedAt, &s.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get survey by refid: %w", err)
	}
	return s, nil
}

func (r *SurveyRepo) GetByID(id string) (*models.Survey, error) {
	s := &models.Survey{}
	err := r.db.QueryRow(
		`SELECT id, refid, name, secname, data, created_at, updated_at
		 FROM surveys WHERE id = $1`,
		id,
	).Scan(&s.ID, &s.RefID, &s.Name, &s.SecName, &s.Data, &s.CreatedAt, &s.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get survey by id: %w", err)
	}
	return s, nil
}

func (r *SurveyRepo) Update(id string, req *models.UpdateSurveyRequest) (*models.Survey, error) {
	s := &models.Survey{}
	err := r.db.QueryRow(
		`UPDATE surveys
		 SET name = COALESCE(NULLIF($2, ''), name),
		     secname = COALESCE($3, secname),
		     data = COALESCE($4, data),
		     updated_at = NOW()
		 WHERE id = $1
		 RETURNING id, refid, name, secname, data, created_at, updated_at`,
		id, req.Name, req.SecName, jsonOrNull(req.Data),
	).Scan(&s.ID, &s.RefID, &s.Name, &s.SecName, &s.Data, &s.CreatedAt, &s.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("update survey: %w", err)
	}
	return s, nil
}

func (r *SurveyRepo) Delete(id string) error {
	result, err := r.db.Exec(`DELETE FROM surveys WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete survey: %w", err)
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("survey not found")
	}
	return nil
}

func jsonOrNull(data json.RawMessage) interface{} {
	if len(data) == 0 {
		return nil
	}
	return data
}
