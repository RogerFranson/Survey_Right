package main

import (
	"log"
	"survey-right/internal/config"
	"survey-right/internal/handlers"
	"survey-right/internal/middleware"
	"survey-right/internal/repository"
	"survey-right/internal/websocket"

	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.Load()

	db, err := config.ConnectDB(cfg)
	if err != nil {
		log.Fatalf("Database connection failed: %v", err)
	}
	defer db.Close()
	log.Println("Connected to PostgreSQL")

	// Run migrations
	if err := handlers.RunMigrations(db, "migrations"); err != nil {
		log.Printf("Migration warning: %v", err)
	} else {
		log.Println("Migrations applied")
	}

	// Initialize repos
	surveyRepo := repository.NewSurveyRepo(db)
	responseRepo := repository.NewResponseRepo(db)

	// Initialize WebSocket hub
	hub := websocket.NewHub()

	// Initialize handlers
	surveyHandler := handlers.NewSurveyHandler(surveyRepo)
	responseHandler := handlers.NewResponseHandler(responseRepo, hub)

	// Setup router
	r := gin.Default()
	r.Use(middleware.CORS())

	// API routes
	api := r.Group("/api")
	{
		// Survey endpoints
		api.POST("/surveys", surveyHandler.Create)
		api.GET("/surveys", surveyHandler.List)
		api.GET("/surveys/:refid", surveyHandler.GetByRefID)
		api.PUT("/surveys/:id", surveyHandler.Update)
		api.DELETE("/surveys/:id", surveyHandler.Delete)

		// Response endpoints
		api.POST("/responses", responseHandler.Create)
		api.POST("/responses/bulk", responseHandler.BulkCreate)
		api.GET("/responses/:refid", responseHandler.GetByRefID)
		api.GET("/export/:refid", responseHandler.ExportCSV)
	}

	// WebSocket for live dashboard
	r.GET("/ws/dashboard/:refid", hub.HandleWS)

	listenAddr := "0.0.0.0:" + cfg.ServerPort
	log.Printf("Server starting on %s", listenAddr)
	if err := r.Run(listenAddr); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
