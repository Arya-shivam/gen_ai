import 'dotenv/config'
import OpenAI from "openai";
const openai = new OpenAI();

async function main(){
    const embeddings = await openai.embeddings.create({
        model:"text-embedding-3-small",
        input:"I am trying to learn GEN AI from piyush sir.",
        ecnoding_format:"float"
    })
    console.log(embeddings)
}

main()