package handlers

import (
	"net/http"
	"survey-right/internal/models"
	"survey-right/internal/repository"

	"github.com/gin-gonic/gin"
)

type SurveyHandler struct {
	repo *repository.SurveyRepo
}

func NewSurveyHandler(repo *repository.SurveyRepo) *SurveyHandler {
	return &SurveyHandler{repo: repo}
}

func (h *SurveyHandler) Create(c *gin.Context) {
	var req models.CreateSurveyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	survey, err := h.repo.Create(&req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, survey)
}

func (h *SurveyHandler) List(c *gin.Context) {
	surveys, err := h.repo.GetAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if surveys == nil {
		surveys = []models.Survey{}
	}
	c.JSON(http.StatusOK, surveys)
}

func (h *SurveyHandler) GetByRefID(c *gin.Context) {
	refid := c.Param("refid")
	survey, err := h.repo.GetByRefID(refid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if survey == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "survey not found"})
		return
	}
	c.JSON(http.StatusOK, survey)
}

func (h *SurveyHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var req models.UpdateSurveyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	survey, err := h.repo.Update(id, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if survey == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "survey not found"})
		return
	}
	c.JSON(http.StatusOK, survey)
}

func (h *SurveyHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	if err := h.repo.Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "survey deleted"})
}
