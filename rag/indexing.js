import 'dotenv/config';
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
// import { OpenAIEmbeddings } from "@langchain/openai";
import { QdrantVectorStore } from "@langchain/qdrant";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai"; 

const pdfFilePath   = 'rag/Javabook.pdf';

async function Pdfindexing(){
    const loader = new PDFLoader(pdfFilePath);
    const docs = await loader.load();


    // Ready the client OPEN AI embeddings

const embeddings = new GoogleGenerativeAIEmbeddings({
        apiKey: process.env.GEMINI_API_KEY, // Use your Google API key
        modelName: "embedding-001", // The model for Gemini embeddings
    });

const collection = "Java_RAG";

const vectorStore = await QdrantVectorStore.fromDocuments(
    docs , embeddings , { 
        url : 'http://localhost:6333',
        collectionName : collection
    },
)

console.log("Indexing Done.....")

}
Pdfindexing()