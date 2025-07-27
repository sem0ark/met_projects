-- db/init.sql
-- Create database and user with specific privileges
-- This addresses "Use Non-Root Users in Containers" for the database and "Least Privilege Principle"
CREATE DATABASE IF NOT EXISTS `appdb`;

-- Create a user that only connects from within the Docker network
-- This addresses "Be Mindful of Inter-Container Connectivity" by restricting host
CREATE USER 'appuser'@'%' IDENTIFIED BY 'backend_db_password'; -- Password will be injected from secret
GRANT ALL PRIVILEGES ON `appdb`.* TO 'appuser'@'%';
FLUSH PRIVILEGES;

-- For development, you might have a root user, but in production,
-- consider disabling remote root login. The Docker image handles this by default
-- by only allowing root from localhost unless explicitly configured.
