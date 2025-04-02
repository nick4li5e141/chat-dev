# Use the official Node.js image as the base image
FROM node:latest

# Set the working directory inside the container
WORKDIR /public

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies

RUN npm install 

# Copy the rest of the application files
COPY . .

# Expose the application's port
EXPOSE 3000

# Define environment variable
ENV NODE_ENV=production

# Use node with the --trace-warnings flag to show where the warning was created
CMD ["node", "--trace-warnings", "node.js"]
#docker-compose up  -d