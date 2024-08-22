# AI API Example

## Context

This is a sample implementation of how to use Ampliences API's to generate content. This has been built on the lowest level (Plain HTML, CSS and JS) in order for teams to be able to understand and implement the steps.

## Prerequisites
 - You must have a user with Amplience which has content studio entitlements
 - You must have generated a PAT token to use this sample application
 - You must have credits to spend
 - You must have the following setup in your content studio
    - At least one Tone of Voice
    - At least one Brand
    - At least one Audience
    - GPT4-O Model enabled
    - Template 'Product Description' enabled

## High Level Flow

1. Input PAT token
2. Select CMS Hub
3. Select generation
    1. Audience
    2. Voice
    3. Tone
    4. Product Name (Optional)
    5. Product Description (Optional)
    6. Product Images (Optional) [ Comma seperated list of Amplience image URLS]
    7. Keywords (Optional) [ Comma Seperated ]
    8. Additional Instructions (Optional) [ Primary use case 'Write in XXX language']
4. Submit Generation request
5. Stream response from generated response URL
6. Convert stream to create text with appends
7. Convert markdown response to HTML (optional using open source showdown library)
8. HTML Response shown in textbox


## Real usage

When building an integration, many points will be omitted as they will be coded into your integration. For example:

- PAT token will be known
- The Organisation and CMS Hub will be known
- Template(s) will be known
- Model(s) will be known
- Generation configuration (Audiences, tones, voice) will be known
- Current variables will be set by the integration not by user prompt
etc.

> Note: This example shows a thread for a single generation. 

## Documentation & Customisation

- Amplience [GraphQL API Playground][https://api.amplience.net/graphql]
- For specific call orders and flows a suggestion is to open the network panel when in Content Studio to find call requests and responses.