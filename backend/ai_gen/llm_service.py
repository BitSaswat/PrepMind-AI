"""
LLM Service for question generation using Google's Gemini API.
Provides robust API interaction with retry logic, error handling, and logging.
"""

import os
import time
from typing import Optional
from dotenv import load_dotenv
from google import genai
from google.genai import types

from .logger import get_logger
from .constants import (
    DEFAULT_MODEL, DEFAULT_TEMPERATURE, DEFAULT_LOCATION, API_TIMEOUT,
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
    Service class for interacting with LLM API via Vertex AI (google-genai).
    Handles initialization, API calls, retries, and error handling.
    """
    
    def __init__(
        self,
        model: str = DEFAULT_MODEL,
        temperature: float = DEFAULT_TEMPERATURE,
        location: str = DEFAULT_LOCATION
    ):
        """
        Initialize LLM service.
        
        Args:
            model: Model name to use
            temperature: Temperature for generation (0.0 to 1.0)
            location: Vertex AI location
        """
        self.model = model
        self.temperature = temperature
        self.location = location
        
        # Get Project ID
        self.project_id = os.getenv("GOOGLE_CLOUD_PROJECT")
        if not self.project_id:
            logger.error("GOOGLE_CLOUD_PROJECT not found in environment")
            raise ConfigurationError("GOOGLE_CLOUD_PROJECT not found in environment")
        
        # Initialize Vertex AI Client
        try:
            self.client = genai.Client(
                vertexai=True,
                project=self.project_id,
                location=self.location
            )
            logger.info(f"LLM Service initialized (Vertex AI) with model: {self.model}, project: {self.project_id}")
        except Exception as e:
            logger.error(f"Failed to initialize Vertex AI Client: {str(e)}")
            raise ConfigurationError(f"Failed to initialize Vertex AI Client: {str(e)}")
    
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
        """
        logger.debug(f"Calling LLM with prompt length: {len(prompt)} chars")
        
        last_exception = None
        current_delay = retry_delay
        
        # Configuration for generation
        # max_output_tokens: Limit output to prevent over-generation
        # ~300 tokens per question * 50 questions = 15000, add buffer = 18000
        config = types.GenerateContentConfig(
            temperature=self.temperature,
            candidate_count=1,
            max_output_tokens=18000  # Hard limit to prevent generating >50 questions
        )
        
        for attempt in range(max_retries):
            try:
                start_time = time.time()
                
                # Make API call using Vertex AI Client
                response = self.client.models.generate_content(
                    model=self.model,
                    contents=prompt,
                    config=config
                )
                
                duration = time.time() - start_time
                logger.info(f"LLM call successful (attempt {attempt + 1}/{max_retries}, {duration:.2f}s)")
                
                # Validate response
                if not response or not response.text:
                    raise APIError("Invalid response from LLM: empty text")
                
                response_text = response.text
                logger.debug(f"Response length: {len(response_text)} chars")
                return response_text
                
            except Exception as e:
                last_exception = e
                error_msg = str(e).lower()
                
                # Check for rate limiting
                if "429" in error_msg or "rate limit" in error_msg or "quota" in error_msg or "resource exhausted" in error_msg:
                    logger.warning(f"Rate limit hit on attempt {attempt + 1}/{max_retries}")
                    
                    # Try to extract wait time from error message
                    import re
                    wait_time = current_delay
                    match = re.search(r"retry in (\d+(\.\d+)?)s", error_msg)
                    if match:
                        wait_time = float(match.group(1)) + 1.0  # Add 1s buffer
                        logger.info(f"API requested wait of {wait_time:.2f}s")
                    
                    if attempt < max_retries - 1:
                        sleep_time = max(wait_time, current_delay)
                        logger.info(f"Retrying after {sleep_time:.2f}s...")
                        time.sleep(sleep_time)
                        current_delay = max(current_delay * RETRY_BACKOFF_FACTOR, sleep_time)
                        continue
                    else:
                        raise RateLimitError(
                            f"Rate limit exceeded after {max_retries} attempts",
                            retry_after=int(wait_time)
                        )
                
                # Check for timeout
                elif "timeout" in error_msg or "504" in error_msg:
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
        
        # Should not reach here
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