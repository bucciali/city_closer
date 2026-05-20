package kafka

import (
	"context"
	"encoding/json"
	"log"

	"github.com/segmentio/kafka-go"
)

type Consumer struct {
	reader *kafka.Reader
}

func NewConsumer(brokers []string, topic string, groupID string) *Consumer {
	r := kafka.NewReader(kafka.ReaderConfig{
		Brokers:  brokers,
		Topic:    topic,
		GroupID:  groupID,
		MinBytes: 10e3,
		MaxBytes: 10e6,
	})
	return &Consumer{reader: r}
}

func (c *Consumer) Consume(ctx context.Context, handler func(event PointEvent)) {
	for {
		msg, err := c.reader.ReadMessage(ctx)
		if err != nil {
			log.Printf("Kafka consume error: %v", err)
			break
		}

		var event PointEvent
		if err := json.Unmarshal(msg.Value, &event); err != nil {
			log.Printf("Kafka parse error: %v", err)
			continue
		}

		log.Printf("Kafka event received: %+v", event)
		handler(event)
	}
}

func (c *Consumer) Close() error {
	return c.reader.Close()
}
