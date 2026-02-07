"""
LLM Service for question generation using Google's Gemini API.
Provides robust API interaction with retry logic, error handling, and logging.
"""

import os
import time
from typing import Optional
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI

from .logger import get_logger
from .constants import (
    DEFAULT_MODEL, DEFAULT_TEMPERATURE, API_TIMEOUT,
    MAX_RETRIES, RETRY_DELAY, RETRY_BACKOFF_FACTOR,
    ERROR_API_KEY_MISSING
)
from .exceptions import (
    LLMServiceError, APIError, RateLimitError,
    TimeoutError as AITimeoutError, ConfigurationError
)

# Initialize logger
logger = get_logger("llm_service")

# Load environment variables
load_dotenv()


class LLMService:
    """
    Service class for interacting with LLM API.
    Handles initialization, API calls, retries, and error handling.
    """
    
    def __init__(
        self,
        model: str = DEFAULT_MODEL,
        temperature: float = DEFAULT_TEMPERATURE,
        api_key: Optional[str] = None
    ):
        """
        Initialize LLM service.
        
        Args:
            model: Model name to use
            temperature: Temperature for generation (0.0 to 1.0)
            api_key: Optional API key (if not provided, loads from env)
            
        Raises:
            ConfigurationError: If API key is missing
        """
        self.model = model
        self.temperature = temperature
        
        # Get API key
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            logger.error("GEMINI_API_KEY not found in environment")
            raise ConfigurationError(ERROR_API_KEY_MISSING, config_key="GEMINI_API_KEY")
        
        # Initialize LLM
        try:
            self.llm = ChatGoogleGenerativeAI(
                model=self.model,
                google_api_key=self.api_key,
                temperature=self.temperature,
                timeout=API_TIMEOUT
            )
            logger.info(f"LLM Service initialized with model: {self.model}, temperature: {self.temperature}")
        except Exception as e:
            logger.error(f"Failed to initialize LLM: {str(e)}")
            raise ConfigurationError(f"Failed to initialize LLM: {str(e)}")
    
    def call(
        self,
        prompt: str,
        max_retries: int = MAX_RETRIES,
        retry_delay: float = RETRY_DELAY
    ) -> str:
        """
        Call LLM with retry logic and error handling.
        
        Args:
            prompt: Prompt to send to LLM
            max_retries: Maximum number of retry attempts
            retry_delay: Initial delay between retries (seconds)
            
        Returns:
            LLM response text
            
        Raises:
            LLMServiceError: If all retry attempts fail
            RateLimitError: If rate limit is exceeded
            AITimeoutError: If request times out
        """
        logger.debug(f"Calling LLM with prompt length: {len(prompt)} chars")
        
        last_exception = None
        current_delay = retry_delay
        
        for attempt in range(max_retries):
            try:
                start_time = time.time()
                
                # Make API call
                response = self.llm.invoke(prompt)
                
                duration = time.time() - start_time
                logger.info(f"LLM call successful (attempt {attempt + 1}/{max_retries}, {duration:.2f}s)")
                
                # Validate response
                if not response or not hasattr(response, 'content'):
                    raise APIError("Invalid response from LLM: missing content")
                
                response_text = response.content
                if not response_text or not isinstance(response_text, str):
                    raise APIError("Invalid response from LLM: empty or non-string content")
                
                logger.debug(f"Response length: {len(response_text)} chars")
                return response_text
                
            except Exception as e:
                last_exception = e
                error_msg = str(e).lower()
                
                # Check for rate limiting
                if "rate limit" in error_msg or "quota" in error_msg:
                    logger.warning(f"Rate limit hit on attempt {attempt + 1}/{max_retries}")
                    if attempt < max_retries - 1:
                        logger.info(f"Retrying after {current_delay}s...")
                        time.sleep(current_delay)
                        current_delay *= RETRY_BACKOFF_FACTOR
                        continue
                    else:
                        raise RateLimitError(
                            f"Rate limit exceeded after {max_retries} attempts",
                            retry_after=int(current_delay)
                        )
                
                # Check for timeout
                elif "timeout" in error_msg:
                    logger.warning(f"Request timeout on attempt {attempt + 1}/{max_retries}")
                    if attempt < max_retries - 1:
                        logger.info(f"Retrying after {current_delay}s...")
                        time.sleep(current_delay)
                        current_delay *= RETRY_BACKOFF_FACTOR
                        continue
                    else:
                        raise AITimeoutError(f"Request timed out after {max_retries} attempts")
                
                # Generic error
                else:
                    logger.error(f"LLM call failed on attempt {attempt + 1}/{max_retries}: {str(e)}")
                    if attempt < max_retries - 1:
                        logger.info(f"Retrying after {current_delay}s...")
                        time.sleep(current_delay)
                        current_delay *= RETRY_BACKOFF_FACTOR
                        continue
                    else:
                        raise LLMServiceError(
                            f"LLM call failed after {max_retries} attempts: {str(e)}"
                        )
        
        # Should not reach here, but just in case
        raise LLMServiceError(
            f"LLM call failed after {max_retries} attempts",
            details={"last_error": str(last_exception)}
        )


# Global LLM service instance
_llm_service: Optional[LLMService] = None


def get_llm_service() -> LLMService:
    """
    Get or create global LLM service instance.
    
    Returns:
        LLM service instance
    """
    global _llm_service
    if _llm_service is None:
        _llm_service = LLMService()
    return _llm_service


def call_llm(prompt: str) -> str:
    """
    Convenience function to call LLM.
    
    Args:
        prompt: Prompt to send to LLM
        
    Returns:
        LLM response text
        
    Raises:
        LLMServiceError: If LLM call fails
    """
    service = get_llm_service()
    return service.call(prompt)