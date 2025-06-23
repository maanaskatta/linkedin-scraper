# ✅ Use Playwright base image with all dependencies and Chromium preinstalled
FROM mcr.microsoft.com/playwright:v1.44.0-jammy

# Set working directory
WORKDIR /app

# Copy project files into container
COPY . .

# Install Node.js dependencies
RUN npm install

# Ensure Playwright installs browsers (already in image, but ensures up-to-date)
RUN npx playwright install

# Start the app
CMD ["node", "index.js"]
