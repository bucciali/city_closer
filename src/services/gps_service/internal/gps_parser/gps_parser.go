package gps

import (
	"strconv"
	"strings"
)

type GPSPoint struct {
	Lat        float64
	Lng        float64
	Altitude   float64
	Satellites int
	Quality    int
	Valid      bool
}

type GPSParser struct {
	Position GPSPoint
}

func (p *GPSParser) ParseNMEA(line string) bool {
	if !strings.HasPrefix(line, "$GPGGA") {
		return false
	}

	parts := strings.Split(line, ",")
	if len(parts) < 10 {
		return false
	}

	quality, _ := strconv.Atoi(parts[6])
	if quality == 0 {
		p.Position.Valid = false
		return false
	}

	// Широта
	latDegMin, _ := strconv.ParseFloat(parts[2], 64)
	latDeg := float64(int(latDegMin / 100))
	latMin := latDegMin - latDeg*100
	lat := latDeg + latMin/60
	if parts[3] == "S" {
		lat = -lat
	}

	// Долгота
	lngDegMin, _ := strconv.ParseFloat(parts[4], 64)
	lngDeg := float64(int(lngDegMin / 100))
	lngMin := lngDegMin - lngDeg*100
	lng := lngDeg + lngMin/60
	if parts[5] == "W" {
		lng = -lng
	}

	p.Position.Lat = lat
	p.Position.Lng = lng
	p.Position.Altitude, _ = strconv.ParseFloat(parts[9], 64)
	p.Position.Satellites, _ = strconv.Atoi(parts[7])
	p.Position.Quality = quality
	p.Position.Valid = true

	return true
}

func (p *GPSParser) GetLocation() (float64, float64) {
	return p.Position.Lat, p.Position.Lng
}
