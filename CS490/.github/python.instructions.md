---
description: 'Python coding conventions and guidelines'
applyTo: '**/*.py'
---

# Python Coding Conventions

## Python Instructions

- Write clear and concise comments for each function.
- Ensure functions have descriptive names and include type hints.
- Provide docstrings describing the "why" and usage scenarios. Avoid redundancy: do not document parameter/return types in docstrings if hints are sufficient.
- Use native type built-ins for annotations (e.g., `list[str]`, `dict[str, int]`) instead of `typing` module aliases (`List`, `Dict`).
- Break down complex functions into smaller, more manageable functions.

## General Instructions

- Always prioritize readability and clarity.
- For algorithm-related code, include explanations of the approach used.
- Write code with good maintainability practices, including comments on why certain design decisions were made.
- Handle edge cases and write clear exception handling.
- For libraries or external dependencies, mention their usage and purpose in comments.
- Use consistent naming conventions and follow language-specific best practices.
- Write concise, efficient, and idiomatic code that is also easily understandable.

## Code Style and Formatting

- Follow the **PEP 8** style guide for Python.
- Maintain proper indentation (use 4 spaces for each level of indentation).
- Ensure lines do not exceed 79 characters.
- Place function and class docstrings immediately after the `def` or `class` keyword.
- Use blank lines to separate functions, classes, and code blocks where appropriate.
- Avoid `hasattr, getattr, setattr` and use only as a last resort, in case their usage is required, the abstractions, used in the code are leaky and require refactoring. Refactor the target classes instead!

## Testing with Pytest

- Use **pytest** for testing.
- Avoid class-based test suites; use function-based tests and parametrize where needed.
- Target **1 cyclomatic complexity** for test functions (linear flow, no loops/branches). Use `pytest.mark.parametrize` for data-driven cases.
- Follow the **AAA** (Arrange-Act-Assert) pattern.
- Always include test cases for critical paths of the application.
- Account for common edge cases like empty inputs, invalid data types, and large datasets.

## Example of Proper Documentation

```python
def calculate_area(radius: float) -> float:
    """
    Calculates the area of a circle.
    
    Used primarily in standard geometry utilities.
    """
    import math
    return math.pi * radius ** 2
```
