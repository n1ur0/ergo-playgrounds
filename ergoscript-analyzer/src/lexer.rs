//! ErgoScript lexer for tokenizing contract source code.
//!
//! This module provides tokenization of ErgoScript contracts, breaking down
//! the source code into meaningful tokens for parsing.

use nom::{
    branch::alt,
    bytes::complete::{tag, take_while, take_while1},
    character::complete::{char, digit1, multispace0, multispace1},
    combinator::{map, opt, recognize, value},
    multi::{many0, many1},
    sequence::{delimited, pair, preceded, tuple},
    IResult,
};
use serde::{Deserialize, Serialize};
use std::fmt;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Token {
    pub token_type: TokenType,
    pub lexeme: String,
    pub position: Position,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Position {
    pub line: usize,
    pub column: usize,
    pub offset: usize,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum TokenType {
    // Literals
    Integer(i64),
    Boolean(bool),
    String(String),
    ByteArray,
    
    // Identifiers and keywords
    Identifier(String),
    Keyword(Keyword),
    
    // Operators
    Plus,
    Minus,
    Multiply,
    Divide,
    Modulo,
    
    // Comparison
    Equal,
    NotEqual,
    Greater,
    GreaterEqual,
    Less,
    LessEqual,
    
    // Logical
    And,
    Or,
    Not,
    
    // Assignment and arrows
    Assign,
    Arrow,
    
    // Delimiters
    LeftParen,
    RightParen,
    LeftBrace,
    RightBrace,
    LeftBracket,
    RightBracket,
    Comma,
    Semicolon,
    Dot,
    Colon,
    
    // Special tokens
    Newline,
    Whitespace,
    Comment(String),
    
    // End of input
    Eof,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum Keyword {
    // Control flow
    If,
    Else,
    
    // Types
    SigmaProp,
    Long,
    Int,
    Byte,
    Coll,
    Option,
    Box,
    
    // ErgoScript built-ins
    Self_,
    Outputs,
    Inputs,
    Context,
    DataInputs,
    Headers,
    PreHeader,
    
    // Functions
    AllOf,
    AnyOf,
    Exists,
    ForAll,
    IsDefined,
    Get,
    Size,
    ToLong,
    ToByte,
    
    // Constants
    True,
    False,
    
    // Variable binding
    Val,
    
    // Other
    Blake2b256,
    Sha256,
    ProveDlog,
    ProveAndOf,
    ProveOrOf,
}

pub struct Lexer<'a> {
    input: &'a str,
    position: Position,
}

impl<'a> Lexer<'a> {
    pub fn new(input: &'a str) -> Self {
        Self {
            input,
            position: Position {
                line: 1,
                column: 1,
                offset: 0,
            },
        }
    }
    
    pub fn tokenize(&mut self) -> Result<Vec<Token>, LexerError> {
        let mut tokens = Vec::new();
        let mut remaining = self.input;
        
        while !remaining.is_empty() {
            match self.next_token(remaining) {
                Ok((rest, token)) => {
                    // Update position
                    let consumed = remaining.len() - rest.len();
                    self.update_position(&remaining[..consumed]);
                    
                    // Skip whitespace tokens in the final result
                    if !matches!(token.token_type, TokenType::Whitespace) {
                        tokens.push(token);
                    }
                    
                    remaining = rest;
                }
                Err(e) => {
                    return Err(LexerError::ParseError {
                        message: format!("Failed to parse token at position {}: {:?}", self.position.offset, e),
                        position: self.position.clone(),
                    });
                }
            }
        }
        
        tokens.push(Token {
            token_type: TokenType::Eof,
            lexeme: String::new(),
            position: self.position.clone(),
        });
        
        Ok(tokens)
    }
    
    fn next_token(&self, input: &str) -> IResult<&str, Token> {
        let position = self.position.clone();
        
        alt((
            self.parse_comment,
            self.parse_whitespace,
            self.parse_keyword_or_identifier,
            self.parse_number,
            self.parse_string,
            self.parse_byte_array,
            self.parse_operator,
            self.parse_delimiter,
        ))(input)
        .map(|(rest, token_type)| {
            let lexeme = &input[..input.len() - rest.len()];
            (
                rest,
                Token {
                    token_type,
                    lexeme: lexeme.to_string(),
                    position,
                },
            )
        })
    }
    
    fn parse_comment(&self, input: &str) -> IResult<&str, TokenType> {
        alt((
            // Single line comment
            map(
                preceded(tag("//"), take_while(|c| c != '\n')),
                |comment: &str| TokenType::Comment(comment.to_string()),
            ),
            // Multi line comment
            map(
                delimited(tag("/*"), take_while(|c| c != '*'), tag("*/")),
                |comment: &str| TokenType::Comment(comment.to_string()),
            ),
        ))(input)
    }
    
    fn parse_whitespace(&self, input: &str) -> IResult<&str, TokenType> {
        alt((
            value(TokenType::Newline, char('\n')),
            value(TokenType::Whitespace, multispace1),
        ))(input)
    }
    
    fn parse_keyword_or_identifier(&self, input: &str) -> IResult<&str, TokenType> {
        let (rest, ident) = recognize(pair(
            alt((char('_'), take_while1(|c: char| c.is_ascii_alphabetic()))),
            take_while(|c: char| c.is_ascii_alphanumeric() || c == '_'),
        ))(input)?;
        
        let token_type = match ident {
            // Control flow
            "if" => TokenType::Keyword(Keyword::If),
            "else" => TokenType::Keyword(Keyword::Else),
            
            // Types
            "sigmaProp" => TokenType::Keyword(Keyword::SigmaProp),
            "Long" => TokenType::Keyword(Keyword::Long),
            "Int" => TokenType::Keyword(Keyword::Int),
            "Byte" => TokenType::Keyword(Keyword::Byte),
            "Coll" => TokenType::Keyword(Keyword::Coll),
            "Option" => TokenType::Keyword(Keyword::Option),
            "Box" => TokenType::Keyword(Keyword::Box),
            
            // ErgoScript built-ins
            "SELF" => TokenType::Keyword(Keyword::Self_),
            "OUTPUTS" => TokenType::Keyword(Keyword::Outputs),
            "INPUTS" => TokenType::Keyword(Keyword::Inputs),
            "CONTEXT" => TokenType::Keyword(Keyword::Context),
            "dataInputs" => TokenType::Keyword(Keyword::DataInputs),
            "headers" => TokenType::Keyword(Keyword::Headers),
            "preHeader" => TokenType::Keyword(Keyword::PreHeader),
            
            // Functions
            "allOf" => TokenType::Keyword(Keyword::AllOf),
            "anyOf" => TokenType::Keyword(Keyword::AnyOf),
            "exists" => TokenType::Keyword(Keyword::Exists),
            "forAll" => TokenType::Keyword(Keyword::ForAll),
            "isDefined" => TokenType::Keyword(Keyword::IsDefined),
            "get" => TokenType::Keyword(Keyword::Get),
            "size" => TokenType::Keyword(Keyword::Size),
            "toLong" => TokenType::Keyword(Keyword::ToLong),
            "toByte" => TokenType::Keyword(Keyword::ToByte),
            
            // Constants
            "true" => TokenType::Keyword(Keyword::True),
            "false" => TokenType::Keyword(Keyword::False),
            
            // Variable binding
            "val" => TokenType::Keyword(Keyword::Val),
            
            // Hash functions
            "blake2b256" => TokenType::Keyword(Keyword::Blake2b256),
            "sha256" => TokenType::Keyword(Keyword::Sha256),
            
            // Proof functions
            "proveDlog" => TokenType::Keyword(Keyword::ProveDlog),
            "proveAndOf" => TokenType::Keyword(Keyword::ProveAndOf),
            "proveOrOf" => TokenType::Keyword(Keyword::ProveOrOf),
            
            // Default to identifier
            _ => TokenType::Identifier(ident.to_string()),
        };
        
        Ok((rest, token_type))
    }
    
    fn parse_number(&self, input: &str) -> IResult<&str, TokenType> {
        map(
            recognize(pair(digit1, opt(pair(char('.'), digit1)))),
            |num_str: &str| {
                if num_str.contains('.') {
                    // For simplicity, treat as integer for now
                    TokenType::Integer(num_str.replace('.', "").parse().unwrap_or(0))
                } else {
                    TokenType::Integer(num_str.parse().unwrap_or(0))
                }
            },
        )(input)
    }
    
    fn parse_string(&self, input: &str) -> IResult<&str, TokenType> {
        map(
            delimited(char('"'), take_while(|c| c != '"'), char('"')),
            |s: &str| TokenType::String(s.to_string()),
        )(input)
    }
    
    fn parse_byte_array(&self, input: &str) -> IResult<&str, TokenType> {
        // Simple recognition of hex byte arrays like 0x1a2b3c
        map(
            preceded(
                tag("0x"),
                take_while1(|c: char| c.is_ascii_hexdigit()),
            ),
            |_| TokenType::ByteArray,
        )(input)
    }
    
    fn parse_operator(&self, input: &str) -> IResult<&str, TokenType> {
        alt((
            // Multi-character operators first
            value(TokenType::GreaterEqual, tag(">=")),
            value(TokenType::LessEqual, tag("<=")),
            value(TokenType::Equal, tag("==")),
            value(TokenType::NotEqual, tag("!=")),
            value(TokenType::And, tag("&&")),
            value(TokenType::Or, tag("||")),
            value(TokenType::Arrow, tag("=>")),
            
            // Single character operators
            value(TokenType::Plus, char('+')),
            value(TokenType::Minus, char('-')),
            value(TokenType::Multiply, char('*')),
            value(TokenType::Divide, char('/')),
            value(TokenType::Modulo, char('%')),
            value(TokenType::Greater, char('>')),
            value(TokenType::Less, char('<')),
            value(TokenType::Not, char('!')),
            value(TokenType::Assign, char('=')),
        ))(input)
    }
    
    fn parse_delimiter(&self, input: &str) -> IResult<&str, TokenType> {
        alt((
            value(TokenType::LeftParen, char('(')),
            value(TokenType::RightParen, char(')')),
            value(TokenType::LeftBrace, char('{')),
            value(TokenType::RightBrace, char('}')),
            value(TokenType::LeftBracket, char('[')),
            value(TokenType::RightBracket, char(']')),
            value(TokenType::Comma, char(',')),
            value(TokenType::Semicolon, char(';')),
            value(TokenType::Dot, char('.')),
            value(TokenType::Colon, char(':')),
        ))(input)
    }
    
    fn update_position(&mut self, consumed: &str) {
        for ch in consumed.chars() {
            self.position.offset += ch.len_utf8();
            if ch == '\n' {
                self.position.line += 1;
                self.position.column = 1;
            } else {
                self.position.column += 1;
            }
        }
    }
}

#[derive(Debug, thiserror::Error)]
pub enum LexerError {
    #[error("Parse error at {position:?}: {message}")]
    ParseError {
        message: String,
        position: Position,
    },
    #[error("Unexpected character: {character} at {position:?}")]
    UnexpectedCharacter {
        character: char,
        position: Position,
    },
    #[error("Unterminated string at {position:?}")]
    UnterminatedString { position: Position },
}

impl fmt::Display for Position {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}:{} (offset: {})", self.line, self.column, self.offset)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_basic_tokenization() {
        let mut lexer = Lexer::new("val x = 42");
        let tokens = lexer.tokenize().unwrap();
        
        assert_eq!(tokens.len(), 4); // val, x, =, 42, EOF
        assert_eq!(tokens[0].token_type, TokenType::Keyword(Keyword::Val));
        assert_eq!(tokens[1].token_type, TokenType::Identifier("x".to_string()));
        assert_eq!(tokens[2].token_type, TokenType::Assign);
        assert_eq!(tokens[3].token_type, TokenType::Integer(42));
    }
    
    #[test]
    fn test_ergoscript_keywords() {
        let mut lexer = Lexer::new("SELF OUTPUTS allOf sigmaProp");
        let tokens = lexer.tokenize().unwrap();
        
        assert_eq!(tokens[0].token_type, TokenType::Keyword(Keyword::Self_));
        assert_eq!(tokens[1].token_type, TokenType::Keyword(Keyword::Outputs));
        assert_eq!(tokens[2].token_type, TokenType::Keyword(Keyword::AllOf));
        assert_eq!(tokens[3].token_type, TokenType::Keyword(Keyword::SigmaProp));
    }
    
    #[test]
    fn test_operators() {
        let mut lexer = Lexer::new("== != >= <= && ||");
        let tokens = lexer.tokenize().unwrap();
        
        assert_eq!(tokens[0].token_type, TokenType::Equal);
        assert_eq!(tokens[1].token_type, TokenType::NotEqual);
        assert_eq!(tokens[2].token_type, TokenType::GreaterEqual);
        assert_eq!(tokens[3].token_type, TokenType::LessEqual);
        assert_eq!(tokens[4].token_type, TokenType::And);
        assert_eq!(tokens[5].token_type, TokenType::Or);
    }
}