package kafka

import (
	"context"
	"encoding/json"
	"log"

	"github.com/segmentio/kafka-go"
)

type Producer struct {
	writer *kafka.Writer
}

func NewProducer(brokers []string, topic string) *Producer {
	w := &kafka.Writer{
		Addr:     kafka.TCP(brokers...),
		Topic:    topic,
		Balancer: &kafka.LeastBytes{},
	}
	return &Producer{writer: w}
}

func (p *Producer) PublishPointEvent(ctx context.Context, event PointEvent) error {
	data, err := json.Marshal(event)
	if err != nil {
		return err
	}

	err = p.writer.WriteMessages(ctx, kafka.Message{
		Key:   []byte(event.PointID),
		Value: data,
	})

	if err != nil {
		log.Printf("Kafka send error: %v", err)
		return err
	}

	log.Printf("Kafka event sent: %+v", event)
	return nil
}

func (p *Producer) Close() error {
	return p.writer.Close()
}
