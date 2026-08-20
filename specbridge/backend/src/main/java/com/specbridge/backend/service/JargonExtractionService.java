package com.specbridge.backend.service;

import com.specbridge.backend.dto.AnalyzeUrlResponse.JargonTerm;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.client.RestClient;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.regex.Pattern;

@Service
public class JargonExtractionService {
    private final String apiKey;
    private final String model;
    private final ObjectMapper objectMapper;

    public JargonExtractionService(
            @Value("${openai.api-key:}") String apiKey,
            @Value("${openai.model:gpt-4o-mini}") String model,
            ObjectMapper objectMapper) {
        this.apiKey = apiKey;
        this.model = model;
        this.objectMapper = objectMapper;
    }

    private static final List<JargonTerm> KNOWN_TERMS = List.of(
            new JargonTerm("API", "서로 다른 프로그램이 데이터를 주고받도록 정해 둔 통신 규칙입니다."),
            new JargonTerm("AI", "사람의 학습과 판단을 컴퓨터가 일부 수행하도록 만든 기술입니다."),
            new JargonTerm("LLM", "대량의 텍스트를 학습해 문장을 이해하고 생성하는 대규모 언어 모델입니다."),
            new JargonTerm("UI", "사용자가 서비스와 직접 보고 조작하는 화면과 구성 요소입니다."),
            new JargonTerm("UX", "사용자가 서비스를 이용하며 느끼는 전체 경험입니다."),
            new JargonTerm("HTTP", "웹 브라우저와 서버가 데이터를 주고받을 때 사용하는 통신 규약입니다."),
            new JargonTerm("클라우드", "인터넷을 통해 서버, 저장 공간 같은 컴퓨팅 자원을 사용하는 방식입니다.")
    );

    public List<JargonTerm> extract(String text) {
        if (!apiKey.isBlank()) {
            try {
                return extractWithLlm(text);
            } catch (Exception ignored) {
                // Keep local analysis available when the optional LLM is unavailable.
            }
        }

        List<JargonTerm> found = new ArrayList<>();
        for (JargonTerm term : KNOWN_TERMS) {
            if (Pattern.compile("(?<![\\p{L}\\p{N}])" + Pattern.quote(term.term()) + "(?![\\p{L}\\p{N}])", Pattern.CASE_INSENSITIVE).matcher(text).find()) {
                found.add(term);
            }
        }
        return found.stream().sorted(Comparator.comparingInt((JargonTerm term) -> term.term().length()).reversed()).toList();
    }

    private List<JargonTerm> extractWithLlm(String text) throws Exception {
        String prompt = "웹페이지 본문에서 전문용어를 최대 20개 추출하고 한국어 설명을 작성하세요. " +
                "JSON 배열만 반환하세요. 각 항목은 term, explanation 키를 가져야 합니다.\n\n" +
                text.substring(0, Math.min(text.length(), 12000));
        String requestBody = objectMapper.writeValueAsString(java.util.Map.of(
                "model", model,
                "temperature", 0.1,
                "messages", List.of(java.util.Map.of("role", "user", "content", prompt))
        ));
        String responseBody = RestClient.create("https://api.openai.com")
                .post()
                .uri("/v1/chat/completions")
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .body(requestBody)
                .retrieve()
                .body(String.class);
        JsonNode content = objectMapper.readTree(responseBody).path("choices").path(0).path("message").path("content");
        List<JargonTerm> result = objectMapper.readValue(content.asText(), objectMapper.getTypeFactory().constructCollectionType(List.class, JargonTerm.class));
        return result.stream().filter(term -> !term.term().isBlank() && !term.explanation().isBlank()).toList();
    }
}