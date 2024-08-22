/*
=================================================================
VARIABLES
(Variables used for content generation)
 - Brief and model are hard coded as consts
 - All others are initiated and populated by selection / content
*/
//---------------------------- START ----------------------------
// PAT token for accessing APIs
let PAT = ""
// Organisation id to scope API calls
let ORG_ID = ""
// CMS hub to scope API calls
let CMS_HUB_ID = ""
// ID if the Content Generation session created
let SESSION_ID = "";
// The name of the product
let PRODUCT_NAME = ""
// Any details about the product that are known
let PRODUCT_FEATURES = ""
// An array of product images. Each image is in the format of {id:id, url,url}
let PRODUCT_IMAGES = []
// As above but ID's only for reference
let PRODUCT_IMAGES_IDS = []
// Keywords used to refine the content specifically for SEO
let KEYWORDS=""
// Additional instructions, for example the language / dialect to write in
let INSTRUCTIONS=""
// This is the ID of the brief template, in this case "Product Description"
const BRIEF_TEMPLATE_ID = "Q29udGVudEdlbmVyYXRpb25CcmllZlRlbXBsYXRlOnByb2R1Y3QtZGVzY3JpcHRpb24="
// This is the ID of the AI model which is GPT-4o
const MODEL_ID = "Q29udGVudEdlbmVyYXRpb25Nb2RlbDpmY2E3ZTUzNS00YmE1LTRlODQtODkzYy0xMDg0YWM1ZGM0NDU="
//^^^^^^^^^^^^^^^^^^^^^^^^^^^^ END ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

/*
=================================================================
STANDARD GRAPHQL CALL
(A Re-usable function which calls the Amplience GraphQL API using
PAT token for auth)
- Inputs: Query to be used in the call with any variables
- Outputs: the reponse JSON
*/
//---------------------------- START ----------------------------
const std_gql_call = async function(query) {
    var apiResults=await fetch("https://api.amplience.net/graphql", {
        method: 'POST',
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${PAT}`
        },
        body: JSON.stringify(query)
    })
    .then(resp=>{
        return resp.json();
    });
    return apiResults;
};
//^^^^^^^^^^^^^^^^^^^^^^^^^^^^ END ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

/*
=================================================================
STANDARD STREAM CALL
(A Re-usable function which calles response stream URL provided for content generation.
It de-codes the stream until then end and then returns the full stream text)
- Inputs: URL to call
- Outputs: Full stream data as a single string
*/
//---------------------------- START ----------------------------
const std_stream_call = async function(url){
    var apiResults=await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
    })
    var total = ''
    const decoder = new TextDecoder();
    for await (const chunk of apiResults?.body) {
        const decodedValue = decoder.decode(chunk);
        total += decodedValue;
    }
    return total
};
//^^^^^^^^^^^^^^^^^^^^^^^^^^^^ END ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

/*
=================================================================
STEP 00
Use PAT token to choose which org & hub for content generation
- Org listings show available credits vs allowance
- Selecting a CMS hub and clicking PROCEED will set the following
    1) ORG_ID
    2) CMS_HUB_ID
- Clicking proceed will trigger STEP 01

> Note: In an integration would not need to query this
*/
//---------------------------- START ----------------------------
// Query to list orgs, credit balances and cms hubs
const QUERY_LIST_ORGS_HUBS = function() {
    return {
    query:
    `query getOrgsAndHubs{
  viewer {
    organizations {
      edges {
        node {
          orgid: id
          name
          ... on Organization{
            creditBalance{
              balance
              creditAllowance
            }
          }
          cmsHubs {
            id
            label
          }
        }
      }
    }
  }
}`
    }
}
// Action Button for this function
const patbtn = document.getElementById("patbtn").onclick=async function(){
    await getHubsList()
};
const getHubsList = async function(){
    var patval = document.querySelector("[name=amp_pat_token]").value
    if(patval){
        PAT = patval;
        const orgsAndHubs = await std_gql_call(QUERY_LIST_ORGS_HUBS())
        //await displayHubsList(orgsAndHubs)
        drawOrgsAndHubs(orgsAndHubs)
    } else{
        alert("Must supply a PAT token")
    }
}

// Function to get org and hub information
const displayHubsList = async function(orgsAndHubs){
    drawOrgsAndHubs(orgsAndHubs)
    return orgsAndHubs;
};
// Draws orgs and hubs to HTML Page
function drawOrgsAndHubs(orgdata){
    document.getElementById("hubsholder").style.visibility = 'visible';
    var hubSelector = document.getElementById("hubs")
    hubSelector.innerHTML = "<h3>Hubs:</h3></br>";
    var orgs = orgdata.data.viewer.organizations.edges;
    for(var a in orgs){
        var org = orgs[a].node
        var orgname = org.name
        var orgid = org.orgid
        var balance = org.creditBalance.balance
        var allowance = org.creditBalance.creditAllowance
        var cmshubs = org.cmsHubs

        if( cmshubs && cmshubs.length){
            var orgHolder = document.createElement("div")
            orgHolder.innerHTML = `
            <div>Organisation Name: ${orgname}</div>
            <div>Credits: ${balance} / ${allowance}</div>`
            for(var c in cmshubs){
                var cmshub = cmshubs[c]
                var id = cmshub.id
                var label = cmshub.label
    
                var input = document.createElement("input");
                input.type = "radio";
                input.id = id;
                input.name = "cmshub"
                input.value = JSON.stringify({ orgid: orgid, cmsid: id});
                orgHolder.appendChild(input)
    
                var title = document.createElement("label");
                title.for = id
                title.value = label
                title.innerHTML = label
                orgHolder.appendChild(title)
    
                orgHolder.innerHTML+= "</br>"
            }
            hubSelector.appendChild(orgHolder)
        }
    }
    
};
//^^^^^^^^^^^^^^^^^^^^^^^^^^^^ END ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

/*
=================================================================
STEP 01
Uses the selected CMS hub to query data for generation
- Audiences
- Voices
- Tones
- Product info fields are visible to input
- Generate button is visible to trigger STEP 02
*/
//---------------------------- START ----------------------------
// Query to get required information from API
const LIST_SETTINGS = function() {
    return {
    query:
    `query ($hubId: ID!) {
        node(id: $hubId) {
            ... on CMSHub {                  
                contentGenerationBrandVoices {
                    edges {                      
                        node {                        
                            id                        
                            label                        
                            brandName                        
                        }
                    }
                },
                contentGenerationAudiences{
                    edges{
                        node{
                            id
                            label
                        }
                    }
                }
                contentGenerationTones{
                    edges{
                        node{
                            id
                            label
                        }
                    }
                }
            }
        }
    }`,
    variables: {hubId:CMS_HUB_ID}
    }
}

document.getElementById("proceed").onclick=async function(){
    await getSettings()
}

const getSettings = async function(){
    var checkedel = document.querySelector("input[type='radio'][name=cmshub]:checked")
    if( checkedel){
        var proceedVal = JSON.parse(checkedel.value)
        CMS_HUB_ID = proceedVal.cmsid
        ORG_ID = proceedVal.orgid
        const settings = await std_gql_call(LIST_SETTINGS())
        drawSettings(settings)
    }else{
        alert("Please Select a CMS hub")
    }
}

const drawSettings = function(settings){
    drawAudiences(settings)
    drawVoices(settings)
    drawTones(settings)
    document.getElementById("messageholder").style.visibility = 'visible';
}

function drawAudiences(settings){
    var audienceSelector = document.getElementById("audiences")
    audienceSelector.innerHTML = "<h3>Audiences:</h3></br>";
    var audiences = settings.data.node.contentGenerationAudiences.edges;
    for(var a in audiences){
        var audience = audiences[a].node
        var input = document.createElement("input");
        input.type = "radio";
        input.id = audience.id;
        input.name = "audience"
        input.value = audience.id;
        if (a == 0) input.setAttribute('checked', true);
        audienceSelector.appendChild(input)

        var label = document.createElement("label");
        label.for = audience.id
        label.value = audience.label
        label.innerHTML = audience.label
        audienceSelector.appendChild(label)

        audienceSelector.innerHTML+= "</br>"
    }
};

function drawVoices(settings){
    var voiceSelector = document.getElementById("voices")
    voiceSelector.innerHTML = "<h3>Voices:</h3></br>";
    var voices = settings.data.node.contentGenerationBrandVoices.edges;
    for(var a in voices){
        var voice = voices[a].node
        var input = document.createElement("input");
        input.type = "radio";
        input.id = voice.id;
        input.name = "voice"
        input.value = voice.id;
        if (a == 0) input.setAttribute('checked', true);
        voiceSelector.appendChild(input)

        var label = document.createElement("label");
        label.for = voice.id
        label.value = voice.label
        label.innerHTML = voice.label
        voiceSelector.appendChild(label)

        voiceSelector.innerHTML+= "</br>"
    }
};

function drawTones(settings){
    var toneSelector = document.getElementById("tones")
    toneSelector.innerHTML = "<h3>Tones:</h3></br>";
    var tones = settings.data.node.contentGenerationTones.edges;
    for(var a in tones){
        var tone = tones[a].node
        var input = document.createElement("input");
        input.type = "radio";
        input.id = tone.id;
        input.name = "tone"
        input.value = tone.id;
        if (a == 0) input.setAttribute('checked', true);
        toneSelector.appendChild(input)

        var label = document.createElement("label");
        label.for = tone.id
        label.value = tone.label
        label.innerHTML = tone.label
        toneSelector.appendChild(label)

        toneSelector.innerHTML+= "</br>"
    }
};

/*
=================================================================
STEP 02
Uses the inputed and selected information to generate
- Creates a content generation session
- Transforms the inputs for a message (ie, creates ID's for images in right format)
- Submits a content generation message using session information
- Returns a response URL for a stream to be read
*/
// Intantiate DOM elements and actions
const descriptionBox = document.getElementById("result");
document.getElementById("submit").onclick = async function(){
    transformInputData()
    var respurl = await submitGeneration()
    await contentGeneration(respurl);
}

const transformInputData = function(){
    // Set values from inputs
    PRODUCT_NAME = document.querySelector("[name=product_name]").value || ""
    PRODUCT_FEATURES = document.querySelector("[name=product_details]").value || ""
    KEYWORDS = document.querySelector("[name=product_keywords]").value || ""
    INSTRUCTIONS = document.querySelector("[name=product_additional]").value || ""
    // Comma Seperated list
    var pimagesval = document.querySelector("[name=product_images]").value || ""
    if(pimagesval){
        // Array
        var imagesArray = pimagesval.split(",")
        // Need to match format and generate an ID
        PRODUCT_IMAGES = imagesArray.map(uri => {
            return {
                id: crypto.randomUUID(),
                url: uri
            }
        })
        // Matching object with just ID's for use in message brief
        PRODUCT_IMAGES_IDS = PRODUCT_IMAGES.map(obj => {
            return{
                id: obj.id
            }
        })
    }else{
        // Set to empty if no images
        PRODUCT_IMAGES = PRODUCT_IMAGES_IDS = []
    }
}

const CREATE_CONTENT_GENERATION_SESSION = function() {
    return {
        query:
        `mutation ($input: CreateContentGenerationSessionInput!) {
            createContentGenerationSession(input: $input) {
                id
                label
                author {
                    user {
                        id
                        name
                    }
                }
                cmsHub {
                    id
                }
                createdDate
            }
        }`,
        variables: {
            input: {
                cmsHubId : CMS_HUB_ID,
                briefTemplateId : BRIEF_TEMPLATE_ID,
                label: "New Session"
            }
        }
    }
}

const SUBMIT_CONTENT_GENERATION_MESSAGE = function(){
    return {
    query:
        `mutation submitContentGenerationMessage ($input: SubmitContentGenerationSessionMessageInput!){
  submitContentGenerationSessionMessage(input: $input){
    submittedMessage{
      id
      parent{
        id
      }
      status
      author{
        role
        user{
          id
          name
          picture
        }
      }
      content{
        __typename
        ... on ContentGenerationSessionMessageBriefContent{
          briefInputs
          modelId
          exampleIds
          images{
            id
            originalUrl
            url
          }
        }
        ... on ContentGenerationSessionMessageRawContentContent{
          body
          scores
        }
      }
      createdDate
      
    }
    responseStreamUrl
  }
}`,
    variables:{
        input: {
            sessionId: SESSION_ID,
            updateSessionLabel: true,
            organizationId: ORG_ID,
            content: {
                briefInputs: `{\"maximumWordCount\":240,\"name\":\"${escape(PRODUCT_NAME)}\",\"features\":\"${escape(PRODUCT_FEATURES)}\",\"attachments\":{\"images\":${JSON.stringify(PRODUCT_IMAGES_IDS)}},\"format\":\"paragraphs_and_bullets\",\"seoKeywords\":\"${KEYWORDS}\",\"additionalInstructions\":\"${escape(INSTRUCTIONS)}\",\"brandVoice\":\"${document.querySelector("input[type='radio'][name=voice]:checked").value}\",\"audience\":\"${document.querySelector("input[type='radio'][name=audience]:checked").value}\",\"tone\":\"${document.querySelector("input[type='radio'][name=tone]:checked").value}\",\"locale\":\"American English\"}`,
                modelId: MODEL_ID,
                exampleIds: [],
                images: PRODUCT_IMAGES || []
            }
        }
    }
}
}
const submitGeneration = async function(){
    descriptionBox.innerHTML = "Generating...";
    descriptionBox.innerHTML += "</br>Starting Session";
    const contentGenerationSession = await std_gql_call(CREATE_CONTENT_GENERATION_SESSION())
    SESSION_ID = contentGenerationSession.data.createContentGenerationSession.id

    descriptionBox.innerHTML += "</br>Submitting request";
    const sumitContentGenerationMessage = await std_gql_call(SUBMIT_CONTENT_GENERATION_MESSAGE())
    const RESPONSE_STREAM_URL = sumitContentGenerationMessage.data.submitContentGenerationSessionMessage.responseStreamUrl

    return RESPONSE_STREAM_URL;
    
};

/*
=================================================================
STEP 03
Reads the stream and displays to the user
- Requests the stream
- Listens until stream closes and returns a full string of all messages
- Parses messages for text values to return a string of the generated text
- Converts markdown to HTML to render in page
- Draws generated HTML into the page
*/
const contentGeneration = async function(resp){
    document.getElementById("result").style.visibility = 'visible';
    const n = await getGeneration(resp)
    const m = await displayGeneration(n)
};
const getGeneration = async function(url){
    descriptionBox.innerHTML += "</br>Reading response...";
    const STREAM_RESPONSE = await std_stream_call(url)
    return STREAM_RESPONSE
}

const displayGeneration = async function(data){
    const chunks = data.split("\n\n")
        .map(chunk => {
            const result = {};
            for (let line of chunk.split('\n')) {
                const keyEnds = line.indexOf(':');
                if (keyEnds !== -1) {
                    const key = line.slice(0, keyEnds);
                    const value = line.slice(keyEnds + 1);
                    result[key] = value.trim();
                }
            }
            return result;
        });

    const body = {};
    chunks.filter(chunk => chunk.event === 'messageRawContentBodyUpdated')
        .forEach(chunk => {
            const data = JSON.parse(chunk.data);
            switch (data.kind) {
                case 'replace':
                    body[data.pointer] = data.value;
                    break;
                case 'append':
                    body[data.pointer] += data.value;
                    break;
            }
        });

    var converter = new showdown.Converter(),
    text = body["/description"],
    html = converter.makeHtml(text);
    descriptionBox.innerHTML = html;
};


