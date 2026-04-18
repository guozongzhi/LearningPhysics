

# Use an official Python runtime as a parent image
FROM docker.m.daocloud.io/library/python:3.11-slim

# Set the working directory in the container
WORKDIR /app

# System dependencies layer removed to avoid OOM killer & redundant installs

# Copy the requirements file into the container at /app
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple

# Copy the rest of the backend application code
COPY . .

# Make port 8000 available to the world outside this container
EXPOSE 8000

# Run the application with increased timeout for large file uploads
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--timeout-keep-alive", "600", "--timeout-graceful-shutdown", "30"]
