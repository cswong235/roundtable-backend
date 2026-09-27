let express = require('express');
let path = require('path');
let app = express();

const { Pool } = require('pg');
require('dotenv').config();
const cors = require('cors');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

app.use(cors());
app.use(express.json());

// Default route
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname + '/index.html'));
})

// Fetch all users
app.get("/users", async (req, res) => {
    try{
        // Fetch all users from the database
        const result = await pool.query('SELECT * FROM users');
        // If there are no users, return a 404 error
        if(result.rows.length === 0){
            return res.status(404).json({ error: "No users found." });
        }
        // If successful, return the result in a JSON format
        res.json(result.rows);
    // For any other errors, return a 500 error with a message
    }catch(err){
        console.error(err);
        res.status(500).json({ error: "Something went wrong, please check back again later." });
    }
});

// Add new user
app.post("/users", async (req, res) => {
    const { name, rating } = req.body;
    if(!name){
        res.status(400).json({ error: "Name is empty." });
    }else if(!rating || rating <= 0 || rating >= 6 || isNaN(rating)){
        res.status(400).json({ error: "Invalid rating value." });
    }else{
        try{
            const result = await pool.query(`
                INSERT INTO users (name, rating)
                VALUES ($1, $2)
                RETURNING *
            `, [name, rating]);
            res.status(201).json(result.rows[0]);
        }catch (err){
            console.error(err);
            res.status(500).json({ error: "Something went wrong, please check back again later." });
        }
    }
})

// Fetch all categories
app.get("/categories", async (req, res) => {
    try{
        const result = await pool.query('SELECT * FROM categories');
        if(result.rows.length === 0){
            return res.status(404).json({ error: "No categories found." });
        }
        res.json(result.rows);
    }catch(err){
        console.error(err);
        res.status(500).json({ error: "Something went wrong, please check back again later." });
    }
});

// Add a recipe
app.post("/recipes", async (req, res) => {
    const { user_id, category_id, image, title, ingredients, instructions, difficulty, time } = req.body;

    const imageVal = image || null;
    const timeVal = time || null;
    const difficultyVal = difficulty || 'easy';

    if(!user_id || !category_id || !title || !ingredients || !instructions){
        res.status(400).json({ error: "One or some fields are empty." });
    }else if(isNaN(user_id) || isNaN(category_id)){
        res.status(400).json({ error: "Invalid user or category ID value." });
    }else{
        try{
            const result = await pool.query(`
                INSERT INTO recipes (user_id, category_id, image, title, ingredients, instructions, difficulty, time)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *
            `, [user_id, category_id, imageVal, title, ingredients, instructions, difficultyVal, timeVal]);
            res.status(201).json(result.rows[0]);
        }catch (err){
            console.error(err);
            res.status(500).json({ error: "Something went wrong, please check back again later." });
        }
    }
})

// Fetch all recipes
app.get("/recipes", async (req, res) => {
    try{
        const result = await pool.query(`
            SELECT r.*, u.name AS chef_name, u.rating AS chef_rating, c.name AS category_name
            FROM recipes r
            JOIN users u ON r.user_id = u.id
            JOIN categories c ON r.category_id = c.id
            ORDER BY r.created_at DESC
        `);
        if(result.rows.length === 0){
            return res.status(404).json({ error: "No recipes found." });
        }
        res.json(result.rows);
    }catch(err){
        console.error(err);
        res.status(500).json({ error: "Something went wrong, please check back again later." });
    }
});

// Fetch one receipe
app.get("/recipes/:id", async (req, res) => {
    const { id } = req.params;
    try{
        const result = await pool.query(`
            SELECT r.*, u.name AS chef_name, u.rating AS chef_rating, c.name AS category_name
            FROM recipes r
            JOIN users u ON r.user_id = u.id
            JOIN categories c ON r.category_id = c.id
            WHERE r.id = $1
            ORDER BY r.created_at DESC
        `, [id]);
        if(result.rows.length === 0){
            return res.status(404).json({ error: "No recipes found." });
        }
        res.json(result.rows);
    }catch(err){
        console.error(err);
        res.status(500).json({ error: "Something went wrong, please check back again later." });
    }
});

app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Roundtable API listening on port ${PORT}`);
});
