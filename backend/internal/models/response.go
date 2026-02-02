package models

import (
	"encoding/json"
	"time"
)

type Response struct {
	ID        string          `json:"id"`
	RefID     string          `json:"refid"`
	Name      string          `json:"name,omitempty"`
	SecName   string          `json:"secname,omitempty"`
	Data      json.RawMessage `json:"data"`
	CreatedAt time.Time       `json:"created_at"`
	UpdatedAt time.Time       `json:"updated_at"`
}

type CreateResponseRequest struct {
	RefID   string          `json:"refid" binding:"required"`
	Name    string          `json:"name"`
	SecName string          `json:"secname"`
	Data    json.RawMessage `json:"data" binding:"required"`
}

type BulkResponseRequest struct {
	Responses []CreateResponseRequest `json:"responses" binding:"required"`
}
