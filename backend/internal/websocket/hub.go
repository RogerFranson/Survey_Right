package websocket

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"

	"github.com/gin-gonic/gin"
	ws "github.com/gorilla/websocket"
)

var upgrader = ws.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type Hub struct {
	mu      sync.RWMutex
	clients map[string]map[*ws.Conn]bool // refid -> set of connections
}

func NewHub() *Hub {
	return &Hub{
		clients: make(map[string]map[*ws.Conn]bool),
	}
}

func (h *Hub) HandleWS(c *gin.Context) {
	refid := c.Param("refid")
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("ws upgrade error: %v", err)
		return
	}

	h.mu.Lock()
	if h.clients[refid] == nil {
		h.clients[refid] = make(map[*ws.Conn]bool)
	}
	h.clients[refid][conn] = true
	h.mu.Unlock()

	defer func() {
		h.mu.Lock()
		delete(h.clients[refid], conn)
		if len(h.clients[refid]) == 0 {
			delete(h.clients, refid)
		}
		h.mu.Unlock()
		conn.Close()
	}()

	// Keep connection alive, read messages (ping/pong)
	for {
		_, _, err := conn.ReadMessage()
		if err != nil {
			break
		}
	}
}

// Broadcast sends a new response event to all dashboard clients watching a survey
func (h *Hub) Broadcast(refid string, data interface{}) {
	msg, err := json.Marshal(data)
	if err != nil {
		log.Printf("ws marshal error: %v", err)
		return
	}

	h.mu.RLock()
	conns := h.clients[refid]
	h.mu.RUnlock()

	for conn := range conns {
		if err := conn.WriteMessage(ws.TextMessage, msg); err != nil {
			log.Printf("ws write error: %v", err)
			conn.Close()
			h.mu.Lock()
			delete(h.clients[refid], conn)
			h.mu.Unlock()
		}
	}
}
