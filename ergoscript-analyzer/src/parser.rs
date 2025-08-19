//! ErgoScript parser for converting tokens into Abstract Syntax Tree (AST).
//!
//! This module provides parsing functionality to convert tokenized ErgoScript
//! contracts into structured AST representations for flow analysis.

use crate::ast::*;
use crate::lexer::{Keyword, Token, TokenType};
use std::collections::VecDeque;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ParseError {
    #[error("Unexpected token: expected {expected}, found {found} at {position}")]
    UnexpectedToken {
        expected: String,
        found: String,
        position: String,
    },
    #[error("Unexpected end of input")]
    UnexpectedEof,
    #[error("Invalid expression: {message}")]
    InvalidExpression { message: String },
    #[error("Unsupported feature: {feature}")]
    UnsupportedFeature { feature: String },
}

pub struct Parser {
    tokens: VecDeque<Token>,
    current: usize,
}

impl Parser {
    pub fn new(tokens: Vec<Token>) -> Self {
        Self {
            tokens: tokens.into(),
            current: 0,
        }
    }
    
    pub fn parse(&mut self) -> Result<Contract, ParseError> {
        let body = self.parse_expression()?;
        Ok(Contract::new(body))
    }
    
    fn current_token(&self) -> Option<&Token> {
        self.tokens.get(self.current)
    }
    
    fn advance(&mut self) -> Option<Token> {
        if self.current < self.tokens.len() {
            let token = self.tokens[self.current].clone();
            self.current += 1;
            Some(token)
        } else {
            None
        }
    }
    
    fn peek(&self) -> Option<&Token> {
        self.tokens.get(self.current + 1)
    }
    
    fn expect_token(&mut self, expected_type: TokenType) -> Result<Token, ParseError> {
        match self.advance() {
            Some(token) if std::mem::discriminant(&token.token_type) == std::mem::discriminant(&expected_type) => {
                Ok(token)
            }
            Some(token) => Err(ParseError::UnexpectedToken {
                expected: format!("{:?}", expected_type),
                found: format!("{:?}", token.token_type),
                position: token.position.to_string(),
            }),
            None => Err(ParseError::UnexpectedEof),
        }
    }
    
    fn parse_expression(&mut self) -> Result<Expression, ParseError> {
        self.parse_logical_or()
    }
    
    fn parse_logical_or(&mut self) -> Result<Expression, ParseError> {
        let mut expr = self.parse_logical_and()?;
        
        while let Some(token) = self.current_token() {
            match &token.token_type {
                TokenType::Or => {
                    self.advance();
                    let right = self.parse_logical_and()?;
                    expr = Expression::LogicalOr(Box::new(expr), Box::new(right));
                }
                _ => break,
            }
        }
        
        Ok(expr)
    }
    
    fn parse_logical_and(&mut self) -> Result<Expression, ParseError> {
        let mut expr = self.parse_equality()?;
        
        while let Some(token) = self.current_token() {
            match &token.token_type {
                TokenType::And => {
                    self.advance();
                    let right = self.parse_equality()?;
                    expr = Expression::LogicalAnd(Box::new(expr), Box::new(right));
                }
                _ => break,
            }
        }
        
        Ok(expr)
    }
    
    fn parse_equality(&mut self) -> Result<Expression, ParseError> {
        let mut expr = self.parse_comparison()?;
        
        while let Some(token) = self.current_token() {
            match &token.token_type {
                TokenType::Equal => {
                    self.advance();
                    let right = self.parse_comparison()?;
                    expr = Expression::Equal(Box::new(expr), Box::new(right));
                }
                TokenType::NotEqual => {
                    self.advance();
                    let right = self.parse_comparison()?;
                    expr = Expression::NotEqual(Box::new(expr), Box::new(right));
                }
                _ => break,
            }
        }
        
        Ok(expr)
    }
    
    fn parse_comparison(&mut self) -> Result<Expression, ParseError> {
        let mut expr = self.parse_addition()?;
        
        while let Some(token) = self.current_token() {
            match &token.token_type {
                TokenType::Greater => {
                    self.advance();
                    let right = self.parse_addition()?;
                    expr = Expression::Greater(Box::new(expr), Box::new(right));
                }
                TokenType::GreaterEqual => {
                    self.advance();
                    let right = self.parse_addition()?;
                    expr = Expression::GreaterEqual(Box::new(expr), Box::new(right));
                }
                TokenType::Less => {
                    self.advance();
                    let right = self.parse_addition()?;
                    expr = Expression::Less(Box::new(expr), Box::new(right));
                }
                TokenType::LessEqual => {
                    self.advance();
                    let right = self.parse_addition()?;
                    expr = Expression::LessEqual(Box::new(expr), Box::new(right));
                }
                _ => break,
            }
        }
        
        Ok(expr)
    }
    
    fn parse_addition(&mut self) -> Result<Expression, ParseError> {
        let mut expr = self.parse_multiplication()?;
        
        while let Some(token) = self.current_token() {
            match &token.token_type {
                TokenType::Plus => {
                    self.advance();
                    let right = self.parse_multiplication()?;
                    expr = Expression::Add(Box::new(expr), Box::new(right));
                }
                TokenType::Minus => {
                    self.advance();
                    let right = self.parse_multiplication()?;
                    expr = Expression::Subtract(Box::new(expr), Box::new(right));
                }
                _ => break,
            }
        }
        
        Ok(expr)
    }
    
    fn parse_multiplication(&mut self) -> Result<Expression, ParseError> {
        let mut expr = self.parse_unary()?;
        
        while let Some(token) = self.current_token() {
            match &token.token_type {
                TokenType::Multiply => {
                    self.advance();
                    let right = self.parse_unary()?;
                    expr = Expression::Multiply(Box::new(expr), Box::new(right));
                }
                TokenType::Divide => {
                    self.advance();
                    let right = self.parse_unary()?;
                    expr = Expression::Divide(Box::new(expr), Box::new(right));
                }
                TokenType::Modulo => {
                    self.advance();
                    let right = self.parse_unary()?;
                    expr = Expression::Modulo(Box::new(expr), Box::new(right));
                }
                _ => break,
            }
        }
        
        Ok(expr)
    }
    
    fn parse_unary(&mut self) -> Result<Expression, ParseError> {
        if let Some(token) = self.current_token() {
            match &token.token_type {
                TokenType::Not => {
                    self.advance();
                    let expr = self.parse_unary()?;
                    return Ok(Expression::Not(Box::new(expr)));
                }
                TokenType::Minus => {
                    self.advance();
                    let expr = self.parse_unary()?;
                    return Ok(Expression::Subtract(
                        Box::new(Expression::Integer(0)),
                        Box::new(expr),
                    ));
                }
                _ => {}
            }
        }
        
        self.parse_postfix()
    }
    
    fn parse_postfix(&mut self) -> Result<Expression, ParseError> {
        let mut expr = self.parse_primary()?;
        
        loop {
            match self.current_token() {
                Some(token) => match &token.token_type {
                    TokenType::Dot => {
                        self.advance();
                        expr = self.parse_member_access(expr)?;
                    }
                    TokenType::LeftBracket => {
                        self.advance();
                        let index = self.parse_expression()?;
                        self.expect_token(TokenType::RightBracket)?;
                        expr = Expression::Get(Box::new(expr), Box::new(index));
                    }
                    TokenType::LeftParen => {
                        self.advance();
                        let args = self.parse_argument_list()?;
                        self.expect_token(TokenType::RightParen)?;
                        
                        // Convert method call to function call if expr is identifier
                        if let Expression::Identifier(name) = expr {
                            expr = Expression::FunctionCall { name, args };
                        } else {
                            return Err(ParseError::InvalidExpression {
                                message: "Invalid function call".to_string(),
                            });
                        }
                    }
                    _ => break,
                },
                None => break,
            }
        }
        
        Ok(expr)
    }
    
    fn parse_member_access(&mut self, object: Expression) -> Result<Expression, ParseError> {
        let member = match self.advance() {
            Some(Token {
                token_type: TokenType::Identifier(name),
                ..
            }) => name,
            Some(token) => {
                return Err(ParseError::UnexpectedToken {
                    expected: "identifier".to_string(),
                    found: format!("{:?}", token.token_type),
                    position: token.position.to_string(),
                });
            }
            None => return Err(ParseError::UnexpectedEof),
        };
        
        // Handle method calls
        if let Some(Token {
            token_type: TokenType::LeftParen,
            ..
        }) = self.current_token()
        {
            self.advance();
            let args = self.parse_argument_list()?;
            self.expect_token(TokenType::RightParen)?;
            
            // Convert to appropriate expression based on method name
            match member.as_str() {
                "size" => Ok(Expression::Size(Box::new(object))),
                "get" if args.len() == 1 => Ok(Expression::Get(Box::new(object), Box::new(args[0].clone()))),
                "isDefined" => Ok(Expression::IsDefined(Box::new(object))),
                "toLong" => Ok(Expression::ToLong(Box::new(object))),
                _ => Ok(Expression::FunctionCall {
                    name: format!("{}.{}", self.expr_to_string(&object), member),
                    args,
                }),
            }
        } else {
            // Handle field access
            let field = self.parse_box_field(&member)?;
            Ok(Expression::BoxAccess(Box::new(object), field))
        }
    }
    
    fn parse_box_field(&self, field_name: &str) -> Result<BoxField, ParseError> {
        match field_name {
            "value" => Ok(BoxField::Value),
            "propositionBytes" => Ok(BoxField::PropositionBytes),
            "id" => Ok(BoxField::Id),
            "tokens" => Ok(BoxField::Tokens),
            "creationInfo" => Ok(BoxField::CreationInfo),
            name if name.starts_with('R') && name.len() > 1 => {
                let register_num = name[1..].parse::<u8>().map_err(|_| {
                    ParseError::InvalidExpression {
                        message: format!("Invalid register name: {}", name),
                    }
                })?;
                Ok(BoxField::Register(register_num))
            }
            _ => Err(ParseError::InvalidExpression {
                message: format!("Unknown box field: {}", field_name),
            }),
        }
    }
    
    fn parse_primary(&mut self) -> Result<Expression, ParseError> {
        match self.advance() {
            Some(token) => match token.token_type {
                TokenType::Integer(value) => Ok(Expression::Integer(value)),
                TokenType::String(value) => Ok(Expression::ByteArray(value.into_bytes())),
                TokenType::ByteArray => {
                    // Parse hex bytes - simplified for now
                    Ok(Expression::ByteArray(vec![]))
                }
                TokenType::Identifier(name) => Ok(Expression::Identifier(name)),
                
                // Keywords
                TokenType::Keyword(Keyword::True) => Ok(Expression::Boolean(true)),
                TokenType::Keyword(Keyword::False) => Ok(Expression::Boolean(false)),
                TokenType::Keyword(Keyword::Self_) => Ok(Expression::Identifier("SELF".to_string())),
                TokenType::Keyword(Keyword::Outputs) => Ok(Expression::Identifier("OUTPUTS".to_string())),
                TokenType::Keyword(Keyword::Context) => Ok(Expression::ContextAccess(ContextField::DataInputs)),
                
                // Function keywords
                TokenType::Keyword(Keyword::AllOf) => {
                    self.expect_token(TokenType::LeftParen)?;
                    let arg = self.parse_expression()?;
                    self.expect_token(TokenType::RightParen)?;
                    Ok(Expression::AllOf(Box::new(arg)))
                }
                TokenType::Keyword(Keyword::AnyOf) => {
                    self.expect_token(TokenType::LeftParen)?;
                    let arg = self.parse_expression()?;
                    self.expect_token(TokenType::RightParen)?;
                    Ok(Expression::AnyOf(Box::new(arg)))
                }
                TokenType::Keyword(Keyword::SigmaProp) => {
                    self.expect_token(TokenType::LeftParen)?;
                    let arg = self.parse_expression()?;
                    self.expect_token(TokenType::RightParen)?;
                    Ok(Expression::SigmaProp(Box::new(arg)))
                }
                
                // Control flow
                TokenType::Keyword(Keyword::If) => self.parse_if_expression(),
                TokenType::Keyword(Keyword::Val) => self.parse_val_binding(),
                
                // Parenthesized expression
                TokenType::LeftParen => {
                    let expr = self.parse_expression()?;
                    self.expect_token(TokenType::RightParen)?;
                    Ok(expr)
                }
                
                // Block expression
                TokenType::LeftBrace => self.parse_block_expression(),
                
                // Collection
                TokenType::Keyword(Keyword::Coll) => {
                    self.expect_token(TokenType::LeftParen)?;
                    let elements = self.parse_argument_list()?;
                    self.expect_token(TokenType::RightParen)?;
                    Ok(Expression::Collection(elements))
                }
                
                _ => Err(ParseError::UnexpectedToken {
                    expected: "expression".to_string(),
                    found: format!("{:?}", token.token_type),
                    position: token.position.to_string(),
                }),
            },
            None => Err(ParseError::UnexpectedEof),
        }
    }
    
    fn parse_if_expression(&mut self) -> Result<Expression, ParseError> {
        self.expect_token(TokenType::LeftParen)?;
        let condition = self.parse_expression()?;
        self.expect_token(TokenType::RightParen)?;
        
        let then_branch = self.parse_expression()?;
        
        let else_branch = if let Some(Token {
            token_type: TokenType::Keyword(Keyword::Else),
            ..
        }) = self.current_token()
        {
            self.advance();
            Some(Box::new(self.parse_expression()?))
        } else {
            None
        };
        
        Ok(Expression::IfElse {
            condition: Box::new(condition),
            then_branch: Box::new(then_branch),
            else_branch,
        })
    }
    
    fn parse_val_binding(&mut self) -> Result<Expression, ParseError> {
        let name = match self.advance() {
            Some(Token {
                token_type: TokenType::Identifier(name),
                ..
            }) => name,
            _ => return Err(ParseError::UnexpectedToken {
                expected: "identifier".to_string(),
                found: "other".to_string(),
                position: "unknown".to_string(),
            }),
        };
        
        self.expect_token(TokenType::Assign)?;
        let value = self.parse_expression()?;
        let body = self.parse_expression()?;
        
        Ok(Expression::Let {
            name,
            value: Box::new(value),
            body: Box::new(body),
        })
    }
    
    fn parse_block_expression(&mut self) -> Result<Expression, ParseError> {
        let expr = self.parse_expression()?;
        self.expect_token(TokenType::RightBrace)?;
        Ok(expr)
    }
    
    fn parse_argument_list(&mut self) -> Result<Vec<Expression>, ParseError> {
        let mut args = Vec::new();
        
        // Handle empty argument list
        if let Some(Token {
            token_type: TokenType::RightParen,
            ..
        }) = self.current_token()
        {
            return Ok(args);
        }
        
        loop {
            args.push(self.parse_expression()?);
            
            match self.current_token() {
                Some(Token {
                    token_type: TokenType::Comma,
                    ..
                }) => {
                    self.advance();
                    continue;
                }
                _ => break,
            }
        }
        
        Ok(args)
    }
    
    fn expr_to_string(&self, expr: &Expression) -> String {
        match expr {
            Expression::Identifier(name) => name.clone(),
            _ => "expr".to_string(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::lexer::Lexer;
    
    fn parse_expression(input: &str) -> Result<Expression, ParseError> {
        let mut lexer = Lexer::new(input);
        let tokens = lexer.tokenize().unwrap();
        let mut parser = Parser::new(tokens);
        parser.parse_expression()
    }
    
    #[test]
    fn test_parse_integer() {
        let expr = parse_expression("42").unwrap();
        assert_eq!(expr, Expression::Integer(42));
    }
    
    #[test]
    fn test_parse_boolean() {
        let expr = parse_expression("true").unwrap();
        assert_eq!(expr, Expression::Boolean(true));
    }
    
    #[test]
    fn test_parse_identifier() {
        let expr = parse_expression("SELF").unwrap();
        assert_eq!(expr, Expression::Identifier("SELF".to_string()));
    }
    
    #[test]
    fn test_parse_arithmetic() {
        let expr = parse_expression("1 + 2 * 3").unwrap();
        // Should parse as 1 + (2 * 3) due to operator precedence
        assert!(matches!(expr, Expression::Add(_, _)));
    }
    
    #[test]
    fn test_parse_comparison() {
        let expr = parse_expression("x == 42").unwrap();
        assert!(matches!(expr, Expression::Equal(_, _)));
    }
    
    #[test]
    fn test_parse_if_expression() {
        let expr = parse_expression("if (x > 0) 1 else 0").unwrap();
        assert!(matches!(expr, Expression::IfElse { .. }));
    }
    
    #[test]
    fn test_parse_function_call() {
        let expr = parse_expression("allOf(conditions)").unwrap();
        assert!(matches!(expr, Expression::AllOf(_)));
    }
}