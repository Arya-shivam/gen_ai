import { Tiktoken } from "js-tiktoken/lite";
import o200k_base from "js-tiktoken/ranks/o200k_base";

export const getTokens = (text)=>{
    const encoder = new Tiktoken(o200k_base);
    return encoder.encode(text);
}

export const DecodeTokens = (tokens)=>{
    const encoder = new Tiktoken(o200k_base);
    return encoder.decode(tokens);
}

console.log(getTokens("Hello how are you"))
console.log(DecodeTokens([ 13225, 1495, 553, 481 ]))