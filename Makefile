.PHONY: dev server client install seed seed-offers stop

dev:
	@echo "Starting server (port 5001) and client (port 5173)..."
	@npx concurrently \
	  --names "SERVER,CLIENT" \
	  --prefix-colors "blue,green" \
	  "cd server && npm run dev" \
	  "cd client && npm run dev"

server:
	cd server && npm run dev

client:
	cd client && npm run dev

install:
	cd server && npm install
	cd client && npm install

seed:
	cd server && node seed_full_history.js

seed-offers:
	cd server && node seed_offers.js

stop:
	-lsof -ti:5001 | xargs kill -9
	-lsof -ti:5173 | xargs kill -9
