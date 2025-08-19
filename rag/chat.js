import 'dotenv/config';
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai"; 
import { QdrantVectorStore } from "@langchain/qdrant";
import { OpenAI } from 'openai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const client = new OpenAI({
    apiKey: GEMINI_API_KEY,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
});


async function chat(){
    const user_query='EXPLAIN ABOUT OOPS AND ITS CONCEPTS' // user query is the question
    const collection = "Java_RAG"; // collection name
    const embeddings = new GoogleGenerativeAIEmbeddings({
        apiKey: process.env.GEMINI_API_KEY, // Use your Google API key
        modelName: "embedding-001", // The model for Gemini embeddings
    });

    const vectorStore = await QdrantVectorStore.fromExistingCollection(
             embeddings , { 
            url : 'http://localhost:6333',
            collectionName : collection
        },
    )

    const vectorSearch = vectorStore.asRetriever(
        {
            k:3 // k is the number of documents to return
        }
    )

    const relevantDocs = vectorSearch.invoke(user_query)

    const SYSTEM_PROMPT=`
        YOU ARE AN AI ASSISTANT WITH DEEP JAVA KNOWLEDGE BASED ON THE PDF FILE PROVIDED IN THE CONTEXT.
        YOUR TASK IS TO ANSWER USER QUERY FROM THE PDF FILE PROVIDED WITH CONTENT AND PAGE NUMBER

        ANSWER ONLY BASED ON THE AVAIABLE CONTEXT FROM FILE ONLY

        CONTEXT:
        ${JSON.stringify(relevantDocs)}

        OUTPUT FORMAT:
        RETURN ANS FROM CONTEXT
        DON'T WRITE PAGE NUMBER LIKE THIS ->  {This information can be found on **page 1**.}
        DON'T RETURN IN MARKDOWN FORMAT 

    `

    const response = await client.chat.completions.create({
            // stateless model have no memory [ zero shot]
            model: "gemini-2.5-pro",
            messages: [
                {role:"system",content:SYSTEM_PROMPT},
                {role:"user", content: user_query },
                
    
            ],
        });
    
        console.log(response.choices[0].message.content);


}
chat()