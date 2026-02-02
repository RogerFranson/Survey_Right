package models

import (
	"encoding/json"
	"time"
)

type Survey struct {
	ID        string          `json:"id"`
	RefID     string          `json:"refid"`
	Name      string          `json:"name"`
	SecName   string          `json:"secname,omitempty"`
	Data      json.RawMessage `json:"data"`
	CreatedAt time.Time       `json:"created_at"`
	UpdatedAt time.Time       `json:"updated_at"`
}

type CreateSurveyRequest struct {
	RefID   string          `json:"refid" binding:"required"`
	Name    string          `json:"name" binding:"required"`
	SecName string          `json:"secname"`
	Data    json.RawMessage `json:"data" binding:"required"`
}

type UpdateSurveyRequest struct {
	Name    string          `json:"name"`
	SecName string          `json:"secname"`
	Data    json.RawMessage `json:"data"`
}
