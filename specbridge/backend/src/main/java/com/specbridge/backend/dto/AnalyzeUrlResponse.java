package com.specbridge.backend.dto;

import java.util.List;

public record AnalyzeUrlResponse(String sourceUrl, String html, List<JargonTerm> terms) {
    public record JargonTerm(String term, String explanation) {
    }
}