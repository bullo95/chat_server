# Dating App Backend

This is the backend service for the Dating App, built with Node.js, Express, and MySQL.

## Database Schema

The application uses MySQL with the following tables:

### Users Table
- `id` (VARCHAR(36)) - Primary key, UUID
- `username` (VARCHAR(255)) - Unique username
- `pin_code` (VARCHAR(255)) - Hashed PIN code
- `gender` (ENUM) - 'female', 'male', 'other'
- `age` (TINYINT) - User's age (18-100)
- `meeting_type` (ENUM) - 'Friendship', 'Dating', 'Networking'
- `description` (TEXT) - User's profile description
- `photo_url` (VARCHAR(255)) - URL to user's profile photo
- `created_at` (DATETIME) - Account creation timestamp
- `updated_at` (DATETIME) - Last update timestamp

### Messages Table
- `id` (VARCHAR(36)) - Primary key, UUID
- `sender_id` (VARCHAR(36)) - Foreign key to users.id
- `receiver_id` (VARCHAR(36)) - Foreign key to users.id
- `content` (TEXT) - Message content
- `is_read` (BOOLEAN) - Message read status (default: false)
- `created_at` (DATETIME) - Message timestamp

### Tokens Table
- `id` (INT) - Primary key, auto-increment
- `user_id` (VARCHAR(36)) - Foreign key to users.id
- `token` (VARCHAR(255)) - Authentication token
- `created_at` (DATETIME) - Token creation timestamp

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables in `.env`:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_DATABASE=dating_app
JWT_SECRET=your_secret
```

3. Create uploads directory:
```bash
mkdir uploads
```

4. Initialize the database:
```bash
mysql -u root -p dating_app < config/database.sql
```

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login with PIN
- `POST /auth/logout` - Logout user
- `GET /auth/verify` - Verify authentication token

### Users
- `GET /users/search` - Search users with filters
  - Query Parameters:
    - `gender` (optional): Single value or array of 'female', 'male', or 'other'
    - `meetingTypes` (optional): Array or single value of 'Friendship', 'Dating', 'Networking'
    - `minAge` (optional): Minimum age (default: 18)
    - `maxAge` (optional): Maximum age (default: 99)
    - `page` (optional): Page number (default: 0)
    - `pageSize` (optional): Results per page (default: 20)
- `GET /users` - Get list of users
- `GET /users/:id` - Get user profile
- `PUT /users/:id` - Update user profile
- `DELETE /users/:id` - Delete user account
- `PUT /users/profile/photo` - Update user's profile photo

### File Uploads
The application handles file uploads for user profile photos with the following specifications:

- **Supported Formats**: JPG, JPEG, PNG
- **Maximum File Size**: 5MB
- **Image Processing**:
  - Images are automatically resized to 800x800 pixels
  - Converted to WebP format for optimal performance
  - Quality set to 80% for good balance between quality and size
- **Storage**: Files are stored in the `uploads` directory
- **File Management**: Old profile photos are automatically deleted when updated

### Messages
- `GET /messages` - Get user's messages
- `POST /messages` - Send a message
- `GET /messages/:id` - Get specific message
- `DELETE /messages/:id` - Delete a message

## Security Features
- PIN code hashing
- JWT token authentication
- SQL injection protection
- Input validation
- Rate limiting

## Development

To start the development server:
```bash
npm run dev
```

The server will start on `http://localhost:3000` by default.
