package handlers

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"net/http"
	"survey-right/internal/models"
	"survey-right/internal/repository"
	"survey-right/internal/websocket"

	"github.com/gin-gonic/gin"
)

type ResponseHandler struct {
	repo *repository.ResponseRepo
	hub  *websocket.Hub
}

func NewResponseHandler(repo *repository.ResponseRepo, hub *websocket.Hub) *ResponseHandler {
	return &ResponseHandler{repo: repo, hub: hub}
}

func (h *ResponseHandler) Create(c *gin.Context) {
	var req models.CreateResponseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	resp, err := h.repo.Create(&req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	// Broadcast to dashboard
	h.hub.Broadcast(req.RefID, resp)
	c.JSON(http.StatusCreated, resp)
}

func (h *ResponseHandler) BulkCreate(c *gin.Context) {
	var req models.BulkResponseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	responses, err := h.repo.BulkCreate(req.Responses)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	// Broadcast each response to dashboard
	for i := range responses {
		h.hub.Broadcast(responses[i].RefID, &responses[i])
	}
	c.JSON(http.StatusCreated, gin.H{
		"count":     len(responses),
		"responses": responses,
	})
}

func (h *ResponseHandler) GetByRefID(c *gin.Context) {
	refid := c.Param("refid")
	responses, err := h.repo.GetByRefID(refid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if responses == nil {
		responses = []models.Response{}
	}
	count, _ := h.repo.CountByRefID(refid)
	c.JSON(http.StatusOK, gin.H{
		"count":     count,
		"responses": responses,
	})
}

func (h *ResponseHandler) ExportCSV(c *gin.Context) {
	refid := c.Param("refid")
	responses, err := h.repo.GetByRefID(refid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Header("Content-Type", "text/csv")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s_responses.csv", refid))

	writer := csv.NewWriter(c.Writer)
	defer writer.Flush()

	// Collect all unique keys from response data
	keySet := make(map[string]bool)
	var parsed []map[string]interface{}
	for _, r := range responses {
		var m map[string]interface{}
		if err := json.Unmarshal(r.Data, &m); err == nil {
			parsed = append(parsed, m)
			for k := range m {
				keySet[k] = true
			}
		}
	}

	// Build header
	header := []string{"id", "refid", "name", "secname", "created_at"}
	var dataKeys []string
	for k := range keySet {
		dataKeys = append(dataKeys, k)
	}
	header = append(header, dataKeys...)
	writer.Write(header)

	// Write rows
	for i, r := range responses {
		row := []string{r.ID, r.RefID, r.Name, r.SecName, r.CreatedAt.Format("2006-01-02 15:04:05")}
		if i < len(parsed) {
			for _, k := range dataKeys {
				val := ""
				if v, ok := parsed[i][k]; ok {
					b, _ := json.Marshal(v)
					val = string(b)
				}
				row = append(row, val)
			}
		}
		writer.Write(row)
	}
}
