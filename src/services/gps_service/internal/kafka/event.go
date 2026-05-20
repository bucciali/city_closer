package kafka

import "time"

type PointEvent struct {
	EventType string `json:"event_type"`
	PointID   string `json:"point_id"`
	Timestamp int64  `json:"timestamp"`
}

func NewPointEvent(eventType, pointID string) PointEvent {
	return PointEvent{
		EventType: eventType,
		PointID:   pointID,
		Timestamp: time.Now().Unix(),
	}
}
