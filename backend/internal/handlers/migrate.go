package handlers

import (
	"database/sql"
	"fmt"
	"os"
)

func RunMigrations(db *sql.DB, migrationsDir string) error {
	content, err := os.ReadFile(migrationsDir + "/001_init.sql")
	if err != nil {
		return fmt.Errorf("read migration: %w", err)
	}
	_, err = db.Exec(string(content))
	if err != nil {
		return fmt.Errorf("execute migration: %w", err)
	}
	return nil
}
